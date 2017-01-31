/*
 * Copyright © 2013-2016 The Nxt Core Developers.
 * Copyright © 2016-2017 Jelurida IP B.V.
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
 *
 */

package nxt.http;

import nxt.Nxt;
import nxt.blockchain.Chain;
import nxt.blockchain.Transaction;
import nxt.db.DbIterator;
import nxt.util.Convert;
import nxt.util.Filter;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONStreamAware;

import javax.servlet.http.HttpServletRequest;
import java.util.Set;

public final class GetUnconfirmedTransactionIds extends APIServlet.APIRequestHandler {

    static final GetUnconfirmedTransactionIds instance = new GetUnconfirmedTransactionIds();

    private GetUnconfirmedTransactionIds() {
        super(new APITag[] {APITag.TRANSACTIONS, APITag.ACCOUNTS}, "account", "account", "account");
    }

    @Override
    protected JSONStreamAware processRequest(HttpServletRequest req) throws ParameterException {

        Chain chain = ParameterParser.getChain(req, false);
        Set<Long> accountIds = Convert.toSet(ParameterParser.getAccountIds(req, false));
        Filter<Transaction> filter = accountIds.isEmpty() && chain == null ?
                transaction -> true
                :
                transaction -> {
                    if (chain != null && transaction.getChain() != chain) {
                        return false;
                    }
                    return accountIds.isEmpty() || accountIds.contains(transaction.getSenderId()) || accountIds.contains(transaction.getRecipientId());
                };

        JSONArray transactionIds = new JSONArray();
        try (DbIterator<? extends Transaction> transactionsIterator = Nxt.getTransactionProcessor().getAllUnconfirmedTransactions()) {
            while (transactionsIterator.hasNext()) {
                Transaction transaction = transactionsIterator.next();
                if (filter.ok(transaction)) {
                    transactionIds.add(Long.toUnsignedString(transaction.getId()));
                }
            }
        }

        JSONObject response = new JSONObject();
        response.put("unconfirmedTransactionIds", transactionIds);
        return response;
    }

}
