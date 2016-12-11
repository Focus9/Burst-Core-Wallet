/*
 * Copyright © 2016 Jelurida IP B.V.
 *
 * See the LICENSE.txt file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with Jelurida B.V.,
 * no part of the Nxt software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE.txt file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
package nxt.ce;

import java.nio.ByteBuffer;
import java.util.Map;

import nxt.Constants;
import nxt.NxtException;
import nxt.account.Account;
import nxt.account.AccountLedger;
import nxt.account.BalanceHome;
import nxt.blockchain.Chain;
import nxt.blockchain.Fee;
import nxt.blockchain.FxtTransactionImpl;
import nxt.blockchain.FxtTransactionType;
import nxt.blockchain.Transaction;
import nxt.blockchain.TransactionType;
import nxt.util.Convert;

import org.json.simple.JSONObject;

/**
 * Coin exchange transaction types for the Fxt chain
 */
public abstract class CoinExchangeFxtTransactionType extends FxtTransactionType {

    private static final byte SUBTYPE_COIN_EXCHANGE_ORDER_ISSUE = 0;
    private static final byte SUBTYPE_COIN_EXCHANGE_ORDER_CANCEL = 1;

    private static final Fee exchangeFee = new Fee.ConstantFee(Constants.ONE_NXT * 2);

    public static TransactionType findTransactionType(byte subtype) {
        switch (subtype) {
            case SUBTYPE_COIN_EXCHANGE_ORDER_ISSUE:
                return CoinExchangeFxtTransactionType.ORDER_ISSUE;
            case SUBTYPE_COIN_EXCHANGE_ORDER_CANCEL:
                return CoinExchangeFxtTransactionType.ORDER_CANCEL;
            default:
                return null;
        }
    }

    private CoinExchangeFxtTransactionType() {}

    @Override
    public final byte getType() {
        return FxtTransactionType.TYPE_COIN_EXCHANGE;
    }

    @Override
    public Fee getBaselineFee(Transaction tx) {
        return exchangeFee;
    }

    /**
     * COIN_EXCHANGE_ORDER_ISSUE transaction type
     */
    public static final TransactionType ORDER_ISSUE = new CoinExchangeFxtTransactionType() {

        @Override
        public final byte getSubtype() {
            return SUBTYPE_COIN_EXCHANGE_ORDER_ISSUE;
        }

        @Override
        public AccountLedger.LedgerEvent getLedgerEvent() {
            return AccountLedger.LedgerEvent.COIN_EXCHANGE_ORDER_ISSUE;
        }

        @Override
        public String getName() {
            return "CoinExchangeOrderIssue";
        }

        @Override
        public OrderIssueFxtAttachment parseAttachment(ByteBuffer buffer) throws NxtException.NotValidException {
            return new OrderIssueFxtAttachment(buffer);
        }

        @Override
        public OrderIssueFxtAttachment parseAttachment(JSONObject attachmentData) throws NxtException.NotValidException {
            return new OrderIssueFxtAttachment(attachmentData);
        }

        @Override
        public boolean applyAttachmentUnconfirmed(FxtTransactionImpl transaction, Account senderAccount) {
            OrderIssueAttachment attachment = (OrderIssueAttachment)transaction.getAttachment();
            BalanceHome.Balance balance = attachment.getChain().getBalanceHome().getBalance(senderAccount.getId());
            if (balance.getUnconfirmedBalance() >= attachment.getQuantityQNT()) {
                balance.addToUnconfirmedBalance(getLedgerEvent(), transaction.getId(), -attachment.getQuantityQNT());
                return true;
            }
            return false;
        }

        @Override
        public void undoAttachmentUnconfirmed(FxtTransactionImpl transaction, Account senderAccount) {
            OrderIssueAttachment attachment = (OrderIssueAttachment)transaction.getAttachment();
            BalanceHome.Balance balance = attachment.getChain().getBalanceHome().getBalance(senderAccount.getId());
            balance.addToUnconfirmedBalance(getLedgerEvent(), transaction.getId(), attachment.getQuantityQNT());
        }

        @Override
        public void applyAttachment(FxtTransactionImpl transaction, Account senderAccount, Account recipientAccount) {
            OrderIssueAttachment attachment = (OrderIssueAttachment)transaction.getAttachment();
            CoinExchange.addOrder(transaction, attachment);
        }

        @Override
        public final void validateAttachment(FxtTransactionImpl transaction) throws NxtException.ValidationException {
            OrderIssueAttachment attachment = (OrderIssueAttachment)transaction.getAttachment();
            if (attachment.getQuantityQNT() <= 0 || attachment.getQuantityQNT() > Constants.MAX_BALANCE_NQT ||
                    attachment.getPriceNQT() <= 0 || attachment.getPriceNQT() > Constants.MAX_BALANCE_NQT) {
                throw new NxtException.NotValidException("Invalid coin exchange order: " + attachment.getJSONObject());
            }
        }

        @Override
        public final boolean canHaveRecipient() {
            return false;
        }
    };

    /**
     * COIN_EXCHANGE_ORDER_CANCEL transaction type
     */
    public static final TransactionType ORDER_CANCEL = new CoinExchangeFxtTransactionType() {

        @Override
        public final byte getSubtype() {
            return SUBTYPE_COIN_EXCHANGE_ORDER_CANCEL;
        }

        @Override
        public AccountLedger.LedgerEvent getLedgerEvent() {
            return AccountLedger.LedgerEvent.COIN_EXCHANGE_ORDER_CANCEL;
        }

        @Override
        public String getName() {
            return "CoinExchangeOrderCancel";
        }

        @Override
        public OrderCancelFxtAttachment parseAttachment(ByteBuffer buffer) throws NxtException.NotValidException {
            return new OrderCancelFxtAttachment(buffer);
        }

        @Override
        public OrderCancelFxtAttachment parseAttachment(JSONObject attachmentData) throws NxtException.NotValidException {
            return new OrderCancelFxtAttachment(attachmentData);
        }

        @Override
        public boolean applyAttachmentUnconfirmed(FxtTransactionImpl transaction, Account senderAccount) {
            return true;
        }

        @Override
        public void undoAttachmentUnconfirmed(FxtTransactionImpl transaction, Account senderAccount) {
        }

        @Override
        public boolean isUnconfirmedDuplicate(Transaction transaction,
                                              Map<TransactionType, Map<String, Integer>> duplicates) {
            OrderCancelAttachment attachment = (OrderCancelAttachment)transaction.getAttachment();
            return TransactionType.isDuplicate(CoinExchangeTransactionType.ORDER_CANCEL,
                    Convert.toHexString(attachment.getOrderHash()), duplicates, true);
        }

        @Override
        public void applyAttachment(FxtTransactionImpl transaction, Account senderAccount, Account recipientAccount) {
            OrderCancelAttachment attachment = (OrderCancelAttachment)transaction.getAttachment();
            CoinExchange.Order order = CoinExchange.getOrder(attachment.getOrderHash());
            if (order != null) {
                CoinExchange.removeOrder(attachment.getOrderHash());
                BalanceHome.Balance balance = Chain.getChain(order.getChainId()).getBalanceHome().getBalance(senderAccount.getId());
                balance.addToUnconfirmedBalance(AccountLedger.LedgerEvent.COIN_EXCHANGE_ORDER_CANCEL, transaction.getId(),
                        order.getQuantity());
            }
        }

        @Override
        public final void validateAttachment(FxtTransactionImpl transaction) throws NxtException.ValidationException {
            OrderCancelAttachment attachment = (OrderCancelAttachment)transaction.getAttachment();
            CoinExchange.Order order = CoinExchange.getOrder(attachment.getOrderHash());
            if (order == null) {
                throw new NxtException.NotCurrentlyValidException("Invalid coin exchange order: " + Convert.toHexString(attachment.getOrderHash()));
            }
            if (order.getAccountId() != transaction.getSenderId()) {
                throw new NxtException.NotValidException("Order " + Convert.toHexString(attachment.getOrderHash())
                        + " was created by account "
                        + Long.toUnsignedString(order.getAccountId()));
            }
        }

        @Override
        public final boolean canHaveRecipient() {
            return false;
        }
    };
}
