/******************************************************************************
 * Copyright © 2013-2015 The Nxt Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * Nxt software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

package nxt.http;

import nxt.ExchangeRequest;
import nxt.NxtException;
import nxt.db.DbIterator;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONStreamAware;

import javax.servlet.http.HttpServletRequest;

public final class GetAccountExchangeRequests extends APIServlet.APIRequestHandler {

    static final GetAccountExchangeRequests instance = new GetAccountExchangeRequests();

    private GetAccountExchangeRequests() {
        super(new APITag[] {APITag.ACCOUNTS, APITag.MS}, "account", "currency", "includeCurrencyInfo", "firstIndex", "lastIndex");
    }

    @Override
    JSONStreamAware processRequest(HttpServletRequest req) throws NxtException {

        long accountId = ParameterParser.getAccountId(req, true);
        long currencyId = ParameterParser.getUnsignedLong(req, "currency", true);
        boolean includeCurrencyInfo = "true".equalsIgnoreCase(req.getParameter("includeCurrencyInfo"));
        int firstIndex = ParameterParser.getFirstIndex(req);
        int lastIndex = ParameterParser.getLastIndex(req);

        JSONArray jsonArray = new JSONArray();
        try (DbIterator<ExchangeRequest> exchangeRequests = ExchangeRequest.getAccountCurrencyExchangeRequests(accountId, currencyId,
                firstIndex, lastIndex)) {
            while (exchangeRequests.hasNext()) {
                jsonArray.add(JSONData.exchangeRequest(exchangeRequests.next(), includeCurrencyInfo));
            }
        }
        JSONObject response = new JSONObject();
        response.put("exchangeRequests", jsonArray);
        return response;
    }

}
