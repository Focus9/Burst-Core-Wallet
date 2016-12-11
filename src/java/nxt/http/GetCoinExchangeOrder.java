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
 *
 */
package nxt.http;

import nxt.NxtException;
import nxt.ce.CoinExchange;
import nxt.ce.CoinExchange.Order;

import static nxt.http.JSONResponses.UNKNOWN_ORDER;

import org.json.simple.JSONStreamAware;

import javax.servlet.http.HttpServletRequest;

public final class GetCoinExchangeOrder extends APIServlet.APIRequestHandler {

    static final GetCoinExchangeOrder instance = new GetCoinExchangeOrder();

    private GetCoinExchangeOrder() {
        super(new APITag[] {APITag.CE}, "orderFullHash");
    }

    @Override
    protected JSONStreamAware processRequest(HttpServletRequest req) throws NxtException {
        byte[] orderHash = ParameterParser.getBytes(req, "orderFullHash", true);
        Order order = CoinExchange.getOrder(orderHash);
        if (order == null) {
            return UNKNOWN_ORDER;
        }
        return JSONData.coinExchangeOrder(order);
    }
}
