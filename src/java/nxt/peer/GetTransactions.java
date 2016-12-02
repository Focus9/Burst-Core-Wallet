/*
 * Copyright © 2013-2016 The Nxt Core Developers.
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
 *
 */

package nxt.peer;

import nxt.Constants;
import nxt.Nxt;
import nxt.blockchain.Blockchain;
import nxt.blockchain.ChainTransactionId;
import nxt.blockchain.Transaction;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONStreamAware;

/**
 * Get the transactions
 */
public class GetTransactions extends PeerServlet.PeerRequestHandler {

    static final GetTransactions instance = new GetTransactions();

    private GetTransactions() {}

    @Override
    JSONStreamAware processRequest(JSONObject request, Peer peer) {
        if (!Constants.INCLUDE_EXPIRED_PRUNABLE) {
            return PeerServlet.UNSUPPORTED_REQUEST_TYPE;
        }
        JSONObject response = new JSONObject();
        JSONArray transactionArray = new JSONArray();
        JSONArray transactions = (JSONArray)request.get("transactions");
        Blockchain blockchain = Nxt.getBlockchain();
        //
        // Return the transactions to the caller
        //
        if (transactions != null) {
            transactions.forEach(chainTransactionJson -> {
                ChainTransactionId chainTransactionId = ChainTransactionId.parse((JSONObject)chainTransactionJson);
                Transaction transaction = blockchain.getTransactionByFullHash(chainTransactionId.getChain(), chainTransactionId.getFullHash());
                if (transaction != null) {
                    transaction.getAppendages(true);
                    JSONObject transactionJSON = transaction.getJSONObject();
                    transactionArray.add(transactionJSON);
                }
            });
        }
        response.put("transactions", transactionArray);
        return response;
    }

    @Override
    boolean rejectWhileDownloading() {
        return true;
    }
}
