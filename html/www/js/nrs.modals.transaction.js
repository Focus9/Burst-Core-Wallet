/******************************************************************************
 * Copyright © 2013-2016 The Nxt Core Developers.                             *
 * Copyright © 2016-2017 Jelurida IP B.V.                                     *
 *                                                                            *
 * See the LICENSE.txt file at the top-level directory of this distribution   *
 * for licensing information.                                                 *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement with Jelurida B.V.,*
 * no part of the Nxt software, including this file, may be copied, modified, *
 * propagated, or distributed except according to the terms contained in the  *
 * LICENSE.txt file.                                                          *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

/**
 * @depends {nrs.js}
 * @depends {nrs.modals.js}
 */
var NRS = (function (NRS, $, undefined) {
    $('body').on("click", ".show_transaction_modal_action", function (e) {
        e.preventDefault();
        var transactionFullHash, chain, sharedKey, fxtTransaction;
        if (typeof $(this).data("fullhash") == "object") {
            var dataObject = $(this).data("fullhash");
            transactionFullHash = dataObject["fullhash"];
            chain = dataObject["chain"];
            sharedKey = dataObject["sharedkey"];
            fxtTransaction = dataObject["fxttransaction"];
        } else {
            transactionFullHash = $(this).data("fullhash");
            chain = $(this).data("chain");
            sharedKey = $(this).data("sharedkey");
            fxtTransaction = $(this).data("fxttransaction");
        }
        var infoModal = $('#transaction_info_modal');
        var isModalVisible = false;
        if (infoModal && infoModal.data('bs.modal')) {
            isModalVisible = infoModal.data('bs.modal').isShown;
        }
        if ($(this).data("back") == "true") {
            NRS.modalStack.pop(); // The forward modal
            NRS.modalStack.pop(); // the current modal
        }
        NRS.showTransactionModal(transactionFullHash, chain, sharedKey, fxtTransaction, isModalVisible);
    });

    NRS.showTransactionModal = function (transaction, chain, sharedKey, fxtTransaction, isModalVisible) {
        if (NRS.fetchingModalData) {
            return;
        }

        NRS.fetchingModalData = true;

        $("#transaction_info_output_top, #transaction_info_output_bottom, #transaction_info_bottom").html("").hide();
        $("#transaction_info_callout").hide();
        var infoTable = $("#transaction_info_table");
        infoTable.hide();
        infoTable.find("tbody").empty();

        try {
            if (typeof transaction != "object") {
                if (fxtTransaction) {
                    NRS.sendRequest("getFxtTransaction", {
                        "transaction": fxtTransaction
                    }, function (response) {
                        NRS.processTransactionModalData(response, sharedKey, fxtTransaction, isModalVisible);
                    });
                } else {
                    NRS.sendRequest("getTransaction", {
                        "fullHash": transaction,
                        "chain": chain
                    }, function (response) {
                        NRS.processTransactionModalData(response, sharedKey, fxtTransaction, isModalVisible);
                    });
                }
            } else {
                NRS.processTransactionModalData(transaction, sharedKey, fxtTransaction, isModalVisible);
            }
        } catch (e) {
            NRS.fetchingModalData = false;
            throw e;
        }
    };

    NRS.getPhasingDetails = function(phasingDetails, phasingParams) {
        var votingModel = NRS.getVotingModelName(parseInt(phasingParams.phasingVotingModel));
        phasingDetails.votingModel = $.t(votingModel);
        switch (votingModel) {
            case 'ASSET':
                NRS.sendRequest("getAsset", { "asset": phasingParams.phasingHolding }, function(response) {
                    phasingDetails.quorum = NRS.convertToQNTf(phasingParams.phasingQuorum, response.decimals);
                    phasingDetails.minBalance = NRS.convertToQNTf(phasingParams.phasingMinBalance, response.decimals);
                }, { isAsync: false });
                break;
            case 'CURRENCY':
                NRS.sendRequest("getCurrency", { "currency": phasingParams.phasingHolding }, function(response) {
                    phasingDetails.quorum = NRS.convertToQNTf(phasingParams.phasingQuorum, response.decimals);
                    phasingDetails.minBalance = NRS.convertToQNTf(phasingParams.phasingMinBalance, response.decimals);
                }, { isAsync: false });
                break;
            default:
                phasingDetails.quorum = phasingParams.phasingQuorum;
                phasingDetails.minBalance = phasingParams.phasingMinBalance;
        }
        var phasingTransactionLink = NRS.getHoldingLink(phasingParams.phasingHolding, phasingParams.phasingVotingModel);
        if (NRS.constants.VOTING_MODELS[votingModel] == NRS.constants.VOTING_MODELS.ASSET) {
            phasingDetails.asset_formatted_html = phasingTransactionLink;
        } else if (NRS.constants.VOTING_MODELS[votingModel] == NRS.constants.VOTING_MODELS.CURRENCY) {
            phasingDetails.currency_formatted_html = phasingTransactionLink;
        }
        var minBalanceModel = NRS.getMinBalanceModelName(parseInt(phasingParams.phasingMinBalanceModel));
        phasingDetails.minBalanceModel = $.t(minBalanceModel);
        var rows = "";
        if (phasingParams.phasingWhitelist && phasingParams.phasingWhitelist.length > 0) {
            rows = "<table class='table table-striped'><thead><tr>" +
                "<th>" + $.t("account") + "</th>" +
                "</tr></thead><tbody>";
            for (var i = 0; i < phasingParams.phasingWhitelist.length; i++) {
                var account = NRS.convertNumericToRSAccountFormat(phasingParams.phasingWhitelist[i]);
                rows += "<tr><td><a href='#' data-user='" + NRS.escapeRespStr(account) + "' class='show_account_modal_action'>" + NRS.getAccountTitle(account) + "</a></td></tr>";
            }
            rows += "</tbody></table>";
        } else {
            rows = "-";
        }
        phasingDetails.whitelist_formatted_html = rows;
        if (phasingParams.phasingLinkedFullHashes && phasingParams.phasingLinkedFullHashes.length > 0) {
            rows = "<table class='table table-striped'><tbody>";
            for (i = 0; i < phasingParams.phasingLinkedFullHashes.length; i++) {
                rows += "<tr><td>" + phasingParams.phasingLinkedFullHashes[i] + "</td></tr>";
            }
            rows += "</tbody></table>";
        } else {
            rows = "-";
        }
        phasingDetails.full_hash_formatted_html = rows;
        if (phasingParams.phasingHashedSecret) {
            phasingDetails.hashedSecret = phasingParams.phasingHashedSecret;
            phasingDetails.hashAlgorithm = NRS.getHashAlgorithm(phasingParams.phasingHashedSecretAlgorithm);
        }
    };

    NRS.processTransactionModalData = function (transaction, sharedKey, fxtTransaction, isModalVisible) {
        NRS.setBackLink();
        NRS.modalStack.push({ class: "show_transaction_modal_action", key: "fullhash",
            value: { fullhash: transaction.fullHash, chain: transaction.chain, sharedkey: sharedKey, fxttransaction: fxtTransaction }});
        try {
            var async = false;

            var transactionDetails = $.extend({}, transaction);
            delete transactionDetails.attachment;
            if (transactionDetails.referencedTransaction == "0") {
                delete transactionDetails.referencedTransaction;
            }
            transactionDetails.entity = NRS.fullHashToId(transactionDetails.fullHash);
            if (transaction.fxtTransaction) {
                transactionDetails.fxt_transaction_formatted_html = NRS.getTransactionLink(null, null, false, null, transaction.fxtTransaction);
                delete transactionDetails.fxtTransaction;
            }
            if (!transactionDetails.confirmations) {
                transactionDetails.confirmations = "/";
            }
            if (!transactionDetails.block) {
                transactionDetails.block = "unconfirmed";
            }
            if (transactionDetails.timestamp) {
                transactionDetails.transactionTime = NRS.formatTimestamp(transactionDetails.timestamp);
            }
            if (transactionDetails.blockTimestamp) {
                transactionDetails.blockGenerationTime = NRS.formatTimestamp(transactionDetails.blockTimestamp);
            }
            if (transactionDetails.height == NRS.constants.MAX_INT_JAVA) {
                transactionDetails.height = "unknown";
            } else {
                transactionDetails.height_formatted_html = NRS.getBlockLink(transactionDetails.height);
                delete transactionDetails.height;
            }
            $("#transaction_info_tab_link").tab("show");

            $("#transaction_info_details_table").find("tbody").empty().append(NRS.createInfoTable(transactionDetails, true));
            var infoTable = $("#transaction_info_table");
            infoTable.find("tbody").empty();

            var incorrect = false;
            if (transaction.senderRS == NRS.accountRS) {
                $("#transaction_info_modal_send_money").attr('disabled','disabled');
                $("#transaction_info_modal_transfer_currency").attr('disabled','disabled');
                $("#transaction_info_modal_send_message").attr('disabled','disabled');
            } else {
                $("#transaction_info_modal_send_money").removeAttr('disabled');
                $("#transaction_info_modal_transfer_currency").removeAttr('disabled');
                $("#transaction_info_modal_send_message").removeAttr('disabled');
            }
            var accountButton;
            if (transaction.senderRS in NRS.contacts) {
                accountButton = NRS.contacts[transaction.senderRS].name.escapeHTML();
                $("#transaction_info_modal_add_as_contact").attr('disabled','disabled');
            } else {
                accountButton = transaction.senderRS;
                $("#transaction_info_modal_add_as_contact").removeAttr('disabled');
            }
            var approveTransactionButton = $("#transaction_info_modal_approve_transaction");
            if (!transaction.attachment || !transaction.block ||
                !transaction.attachment.phasingFinishHeight ||
                transaction.attachment.phasingFinishHeight <= NRS.lastBlockHeight) {
                approveTransactionButton.attr('disabled', 'disabled');
            } else {
                approveTransactionButton.removeAttr('disabled');
                approveTransactionButton.data("fullhash", transaction.fullHash);
                approveTransactionButton.data("timestamp", transaction.timestamp);
                approveTransactionButton.data("minBalanceFormatted", "");
                approveTransactionButton.data("votingmodel", transaction.attachment.phasingVotingModel);
            }

            $("#transaction_info_actions").show();
            $("#transaction_info_actions_tab").find("button").data("account", accountButton);

            if (transaction.attachment && transaction.attachment.phasingFinishHeight) {
                var finishHeight = transaction.attachment.phasingFinishHeight;
                var phasingDetails = {};
                phasingDetails.finishHeight = finishHeight;
                phasingDetails.finishIn = ((finishHeight - NRS.lastBlockHeight) > 0) ? (finishHeight - NRS.lastBlockHeight) + " " + $.t("blocks") : $.t("finished");
                NRS.getPhasingDetails(phasingDetails, transaction.attachment);
                $("#phasing_info_details_table").find("tbody").empty().append(NRS.createInfoTable(phasingDetails, true));
                $("#phasing_info_details_link").show();
            } else {
                $("#phasing_info_details_link").hide();
            }
            var data;
            var message;
            var fieldsToDecrypt = {};
            var i;
            if (NRS.isOfType(transaction, "FxtPayment") || NRS.isOfType(transaction, "OrdinaryPayment")) {
                data = {
                    "type": $.t("ordinary_payment"),
                    "amount": transaction.amountNQT,
                    "fee": transaction.feeNQT,
                    "recipient": transaction.recipientRS ? transaction.recipientRS : transaction.recipient,
                    "sender": transaction.senderRS ? transaction.senderRS : transaction.sender
                };

                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "ArbitraryMessage")) {
                var $output = $("#transaction_info_output_top");
                if (transaction.attachment) {
                    if (transaction.attachment.message) {
                        if (!transaction.attachment["version.Message"] && !transaction.attachment["version.PrunablePlainMessage"]) {
                            try {
                                message = converters.hexStringToString(transaction.attachment.message);
                            } catch (err) {
                                //legacy
                                if (transaction.attachment.message.indexOf("feff") === 0) {
                                    message = NRS.convertFromHex16(transaction.attachment.message);
                                } else {
                                    message = NRS.convertFromHex8(transaction.attachment.message);
                                }
                            }
                        } else {
                            if (transaction.attachment.messageIsText) {
                                message = String(transaction.attachment.message);
                            } else {
                                message = $.t("binary_data");
                            }
                        }
                        $output.html("<div style='color:#999999;padding-bottom:10px'><i class='fa fa-unlock'></i> " + $.t("public_message") + "</div><div style='padding-bottom:10px'>" + NRS.escapeRespStr(message).nl2br() + "</div>");
                    }

                    if (transaction.attachment.encryptedMessage || (transaction.attachment.encryptToSelfMessage && NRS.account == transaction.sender)) {
                        $output.append("" +
                            "<div id='transaction_info_decryption_form'></div>" +
                            "<div id='transaction_info_decryption_output' style='display:none;padding-bottom:10px;'></div>"
                        );
                        if (transaction.attachment.encryptedMessage) {
                            fieldsToDecrypt.encryptedMessage = $.t("encrypted_message");
                        }
                        if (transaction.attachment.encryptToSelfMessage && NRS.account == transaction.sender) {
                            fieldsToDecrypt.encryptToSelfMessage = $.t("note_to_self");
                        }
                        var options = {
                            "noPadding": true,
                            "formEl": "#transaction_info_decryption_form",
                            "outputEl": "#transaction_info_decryption_output"
                        };
                        if (sharedKey) {
                            options["sharedKey"] = sharedKey;
                        }
                        NRS.tryToDecrypt(transaction, fieldsToDecrypt, NRS.getAccountForDecryption(transaction), options);
                    }
                } else {
                    $output.append("<div style='padding-bottom:10px'>" + $.t("message_empty") + "</div>");
                }
                var isCompressed = false;
                if (transaction.attachment.encryptedMessage) {
                    isCompressed = transaction.attachment.encryptedMessage.isCompressed;
                } else if (transaction.attachment.encryptToSelfMessage) {
                    isCompressed = transaction.attachment.encryptToSelfMessage.isCompressed;
                }
                var hash = transaction.attachment.messageHash || transaction.attachment.encryptedMessageHash;
                var hashRow = hash ? ("<tr><td><strong>" + $.t("hash") + "</strong>:&nbsp;</td><td>" + hash + "</td></tr>") : "";
                var downloadLink = "";
                if (transaction.attachment.messageHash && !NRS.isTextMessage(transaction) && transaction.block) {
                    downloadLink = "<tr><td>" + NRS.getMessageDownloadLink(transaction.fullHash, sharedKey) + "</td></tr>";
                }
                $output.append("<table>" +
                    "<tr><td><strong>" + $.t("from") + "</strong>:&nbsp;</td><td>" + NRS.getAccountLink(transaction, "sender") + "</td></tr>" +
                    "<tr><td><strong>" + $.t("to") + "</strong>:&nbsp;</td><td>" + NRS.getAccountLink(transaction, "recipient") + "</td></tr>" +
                    "<tr><td><strong>" + $.t("compressed") + "</strong>:&nbsp;</td><td>" + isCompressed + "</td></tr>" +
                    hashRow + downloadLink +
                "</table>");
                $output.show();
            } else if (NRS.isOfType(transaction, "AliasAssignment")) {
                data = {
                    "type": $.t("alias_assignment"),
                    "alias": transaction.attachment.alias,
                    "data_formatted_html": transaction.attachment.uri.autoLink()
                };
                data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "PollCreation")) {
                data = {
                    "type": $.t("poll_creation"),
                    "name": transaction.attachment.name,
                    "description": transaction.attachment.description,
                    "finish_height": transaction.attachment.finishHeight,
                    "min_number_of_options": transaction.attachment.minNumberOfOptions,
                    "max_number_of_options": transaction.attachment.maxNumberOfOptions,
                    "min_range_value": transaction.attachment.minRangeValue,
                    "max_range_value": transaction.attachment.maxRangeValue,
                    "min_balance": transaction.attachment.minBalance,
                    "min_balance_model": transaction.attachment.minBalanceModel
                };

                if (transaction.attachment.votingModel == -1) {
                    data["voting_model"] = $.t("vote_by_none");
                } else if (transaction.attachment.votingModel == 0) {
                    data["voting_model"] = $.t("vote_by_account");
                } else if (transaction.attachment.votingModel == 1) {
                    data["voting_model"] = $.t("vote_by_balance");
                } else if (transaction.attachment.votingModel == 2) {
                    data["voting_model"] = $.t("vote_by_asset");
                    data["asset_id"] = transaction.attachment.holding;
                } else if (transaction.attachment.votingModel == 3) {
                    data["voting_model"] = $.t("vote_by_currency");
                    data["currency_id"] = transaction.attachment.holding;
                } else if (transaction.attachment.votingModel == 4) {
                    data["voting_model"] = $.t("vote_by_transaction");
                } else if (transaction.attachment.votingModel == 5) {
                    data["voting_model"] = $.t("vote_by_hash");
                } else {
                    data["voting_model"] = transaction.attachment.votingModel;
                }
                for (i = 0; i < transaction.attachment.options.length; i++) {
                    data["option_" + i] = transaction.attachment.options[i];
                }
                if (transaction.sender != NRS.account) {
                    data["sender"] = NRS.getAccountTitle(transaction, "sender");
                }
                data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "VoteCasting")) {
                var vote = "";
                var votes = transaction.attachment.vote;
                if (votes && votes.length > 0) {
                    for (i = 0; i < votes.length; i++) {
                        if (votes[i] == -128) {
                            vote += "N/A";
                        } else {
                            vote += votes[i];
                        }
                        if (i < votes.length - 1) {
                            vote += " , ";
                        }
                    }
                }
                data = {
                    "type": $.t("vote_casting"),
                    "poll_formatted_html": NRS.getEntityLink(transaction.attachment.poll, 4),
                    "vote": vote
                };
                data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "AccountInfo")) {
                data = {
                    "type": $.t("account_info"),
                    "name": transaction.attachment.name,
                    "description": transaction.attachment.description
                };
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "AliasSell")) {
                var type = $.t("alias_sale");
                if (transaction.attachment.priceNQT == "0") {
                    if (transaction.sender == transaction.recipient) {
                        type = $.t("alias_sale_cancellation");
                    } else {
                        type = $.t("alias_transfer");
                    }
                }

                data = {
                    "type": type,
                    "alias_name": transaction.attachment.alias
                };

                if (type == $.t("alias_sale")) {
                    data["price"] = transaction.attachment.priceNQT
                }

                if (type != $.t("alias_sale_cancellation")) {
                    data["recipient"] = transaction.recipientRS ? transaction.recipientRS : transaction.recipient;
                }

                data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;

                if (type == $.t("alias_sale")) {
                    message = "";
                    var messageStyle = "info";

                    NRS.sendRequest("getAlias", {
                        "aliasName": transaction.attachment.alias
                    }, function (response) {
                        NRS.fetchingModalData = false;

                        if (!response.errorCode) {
                            if (transaction.recipient != response.buyer || transaction.attachment.priceNQT != response.priceNQT) {
                                message = $.t("alias_sale_info_outdated");
                                messageStyle = "danger";
                            } else if (transaction.recipient == NRS.account) {
                                message = $.t("alias_sale_direct_offer", {
                                    "nxt": NRS.formatAmount(transaction.attachment.priceNQT)
                                }) + " <a href='#' data-alias='" + NRS.escapeRespStr(transaction.attachment.alias) + "' data-toggle='modal' data-target='#buy_alias_modal'>" + $.t("buy_it_q") + "</a>";
                            } else if (typeof transaction.recipient == "undefined") {
                                message = $.t("alias_sale_indirect_offer", {
                                    "nxt": NRS.formatAmount(transaction.attachment.priceNQT)
                                }) + " <a href='#' data-alias='" + NRS.escapeRespStr(transaction.attachment.alias) + "' data-toggle='modal' data-target='#buy_alias_modal'>" + $.t("buy_it_q") + "</a>";
                            } else if (transaction.senderRS == NRS.accountRS) {
                                if (transaction.attachment.priceNQT != "0") {
                                    message = $.t("your_alias_sale_offer") + " <a href='#' data-alias='" + NRS.escapeRespStr(transaction.attachment.alias) + "' data-toggle='modal' data-target='#cancel_alias_sale_modal'>" + $.t("cancel_sale_q") + "</a>";
                                }
                            } else {
                                message = $.t("error_alias_sale_different_account");
                            }
                        }
                    }, { isAsync: false });

                    if (message) {
                        $("#transaction_info_bottom").html("<div class='callout callout-bottom callout-" + messageStyle + "'>" + message + "</div>").show();
                    }
                }

                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "AliasBuy")) {
                data = {
                    "type": $.t("alias_buy"),
                    "alias_name": transaction.attachment.alias,
                    "price": transaction.amountNQT,
                    "recipient": transaction.recipientRS ? transaction.recipientRS : transaction.recipient,
                    "sender": transaction.senderRS ? transaction.senderRS : transaction.sender
                };

                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "AliasDelete")) {
                data = {
                    "type": $.t("alias_deletion"),
                    "alias_name": transaction.attachment.alias,
                    "sender": transaction.senderRS ? transaction.senderRS : transaction.sender
                };

                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "PhasingVoteCasting")) {
                data = {
                    "type": $.t("transaction_approval")
                };
                for (i = 0; i < transaction.attachment.transactionFullHashes.length; i++) {
                    data["transaction" + (i + 1) + "_formatted_html"] =
                        NRS.getTransactionLink(transaction.attachment.transactionFullHashes[i]);
                }

                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "AccountProperty")) {
                data = {
                    "type": $.t("set_account_property"),
                    "property": transaction.attachment.property,
                    "value": transaction.attachment.value
                };
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "AccountPropertyDelete")) {
                data = {
                    "type": $.t("delete_account_property"),
                    "property_formatted_html": NRS.getEntityLink(transaction.attachment.property, 5)
                };
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "AssetIssuance")) {
                NRS.sendRequest("getAsset", {
                    "asset": NRS.fullHashToId(transaction.fullHash)
                }, function (asset) {
                    data = {
                        "type": $.t("asset_issuance"),
                        "name": transaction.attachment.name,
                        "decimals": transaction.attachment.decimals,
                        "description": transaction.attachment.description
                    };
                    if (!asset.errorCode) {
                        data["initial_quantity"] = [asset.initialQuantityQNT, transaction.attachment.decimals];
                        data["quantity"] = [asset.quantityQNT, transaction.attachment.decimals];
                    }
                    data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
                    $("#transaction_info_callout").html("<a href='#' data-goto-asset='" + NRS.fullHashToId(transaction.fullHash) + "'>Click here</a> to view this asset in the Asset Exchange.").show();

                    infoTable.find("tbody").append(NRS.createInfoTable(data));
                    infoTable.show();
                });
            } else if (NRS.isOfType(transaction, "AssetTransfer")) {
                async = true;
                NRS.sendRequest("getAsset", {
                    "asset": transaction.attachment.asset
                }, function (asset) {
                    data = {
                        "type": $.t("asset_transfer"),
                        "asset_formatted_html": NRS.getEntityLink({ request: "getAsset", key: "asset", id: transaction.attachment.asset }),
                        "asset_name": asset.name,
                        "quantity": [transaction.attachment.quantityQNT, asset.decimals]
                    };

                    data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
                    data["recipient"] = transaction.recipientRS ? transaction.recipientRS : transaction.recipient;
                    infoTable.find("tbody").append(NRS.createInfoTable(data));
                    infoTable.show();
                    if (!isModalVisible) {
                        $("#transaction_info_modal").modal("show");
                    }
                    NRS.fetchingModalData = false;
                });
            } else if (NRS.isOfType(transaction, "AskOrderPlacement") || NRS.isOfType(transaction, "BidOrderPlacement")) {
                async = true;
                NRS.sendRequest("getAsset", {
                    "asset": transaction.attachment.asset
                }, function (asset) {
                    NRS.formatAssetOrder(asset, transaction, isModalVisible)
                });
            } else if (NRS.isOfType(transaction, "AskOrderCancellation")) {
                async = true;
                NRS.sendRequest("getTransaction", {
                    "fullHash": transaction.attachment.orderHash
                }, function (transaction) {
                    if (transaction.attachment.asset) {
                        NRS.sendRequest("getAsset", {
                            "asset": transaction.attachment.asset
                        }, function (asset) {
                            data = {
                                "type": $.t("ask_order_cancellation"),
                                "order_formatted_html": NRS.getTransactionLink(transaction.fullHash),
                                "asset_formatted_html": NRS.getEntityLink({ request: "getAsset", key: "asset", id: transaction.attachment.asset }),
                                "asset_name": asset.name,
                                "quantity": [transaction.attachment.quantityQNT, asset.decimals],
                                "price_formatted_html": NRS.formatQuantity(transaction.attachment.priceNQT, NRS.getChain(transaction.chain).decimals) + " " + NRS.getChain(transaction.chain).name,
                                "total_formatted_html": NRS.formatQuantity(NRS.multiply(transaction.attachment.quantityQNT, transaction.attachment.priceNQT), asset.decimals + NRS.getChain(transaction.chain).decimals) + " " + NRS.getChain(transaction.chain).name
                            };
                            data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
                            infoTable.find("tbody").append(NRS.createInfoTable(data));
                            infoTable.show();
                            if (!isModalVisible) {
                                $("#transaction_info_modal").modal("show");
                            }
                            NRS.fetchingModalData = false;
                        });
                    } else {
                        NRS.fetchingModalData = false;
                    }
                });
            } else if (NRS.isOfType(transaction, "BidOrderCancellation")) {
                async = true;
                NRS.sendRequest("getTransaction", {
                    "fullHash": transaction.attachment.orderHash
                }, function (transaction) {
                    if (transaction.attachment.asset) {
                        NRS.sendRequest("getAsset", {
                            "asset": transaction.attachment.asset
                        }, function (asset) {
                            data = {
                                "type": $.t("bid_order_cancellation"),
                                "order_formatted_html": NRS.getTransactionLink(transaction.fullHash),
                                "asset_formatted_html": NRS.getEntityLink({ request: "getAsset", key: "asset", id: transaction.attachment.asset }),
                                "asset_name": asset.name,
                                "quantity": [transaction.attachment.quantityQNT, asset.decimals],
                                "price_formatted_html": NRS.formatQuantity(transaction.attachment.priceNQT, NRS.getChain(transaction.chain).decimals) + " " + NRS.getChain(transaction.chain).name,
                                "total_formatted_html": NRS.formatQuantity(NRS.multiply(transaction.attachment.quantityQNT, transaction.attachment.priceNQT), asset.decimals + NRS.getChain(transaction.chain).decimals) + " " + NRS.getChain(transaction.chain).name
                            };
                            data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
                            infoTable.find("tbody").append(NRS.createInfoTable(data));
                            infoTable.show();
                            if (!isModalVisible) {
                                $("#transaction_info_modal").modal("show");
                            }
                            NRS.fetchingModalData = false;
                        });
                    } else {
                        NRS.fetchingModalData = false;
                    }
                });
            } else if (NRS.isOfType(transaction, "DividendPayment")) {
                async = true;
                NRS.sendRequest("getTransaction", {
                    "fullHash": transaction.fullHash
                }, function (transaction) {
                    if (transaction.attachment.asset) {
                        NRS.sendRequest("getAsset", {
                            "asset": transaction.attachment.asset
                        }, function (asset) {
                            data = {
                                "type": $.t("dividend_payment"),
                                "asset_formatted_html": NRS.getEntityLink({ request: "getAsset", key: "asset", id: transaction.attachment.asset }),
                                "asset_name": asset.name,
                                "amount_per_share": NRS.intToFloat(transaction.attachment.amountNQT, NRS.getActiveChainDecimals()) + " " + NRS.getChain(transaction.chain).name,
                                "height": transaction.attachment.height
                            };
                            data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
                            infoTable.find("tbody").append(NRS.createInfoTable(data));
                            infoTable.show();

                            if (!isModalVisible) {
                                $("#transaction_info_modal").modal("show");
                            }
                            NRS.fetchingModalData = false;
                        });
                    } else {
                        NRS.fetchingModalData = false;
                    }
                });
            } else if (NRS.isOfType(transaction, "AssetDelete")) {
                async = true;
                NRS.sendRequest("getAsset", {
                    "asset": transaction.attachment.asset
                }, function (asset) {
                    data = {
                        "type": $.t("delete_asset_shares"),
                        "asset_formatted_html": NRS.getEntityLink({ request: "getAsset", key: "asset", id: transaction.attachment.asset }),
                        "asset_name": asset.name,
                        "quantity": [transaction.attachment.quantityQNT, asset.decimals]
                    };

                    data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
                    infoTable.find("tbody").append(NRS.createInfoTable(data));
                    infoTable.show();

                    if (!isModalVisible) {
                        $("#transaction_info_modal").modal("show");
                    }
                    NRS.fetchingModalData = false;
                });
            } else if (NRS.isOfType(transaction, "DigitalGoodsListing")) {
                data = {
                    "type": $.t("marketplace_listing"),
                    "name": transaction.attachment.name,
                    "description": transaction.attachment.description,
                    "price": transaction.attachment.priceNQT,
                    "quantity_formatted_html": NRS.format(transaction.attachment.quantity),
                    "seller": NRS.getAccountFormatted(transaction, "sender")
                };

                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "DigitalGoodsDelisting")) {
                async = true;
                NRS.sendRequest("getDGSGood", {
                    "goods": transaction.attachment.goods
                }, function (goods) {
                    data = {
                        "type": $.t("marketplace_removal"),
                        "item_name": goods.name,
                        "seller": NRS.getAccountFormatted(goods, "seller")
                    };

                    infoTable.find("tbody").append(NRS.createInfoTable(data));
                    infoTable.show();

                    if (!isModalVisible) {
                        $("#transaction_info_modal").modal("show");
                    }
                    NRS.fetchingModalData = false;
                });
            } else if (NRS.isOfType(transaction, "DigitalGoodsPriceChange")) {
                async = true;
                NRS.sendRequest("getDGSGood", {
                    "goods": transaction.attachment.goods
                }, function (goods) {
                    data = {
                        "type": $.t("marketplace_item_price_change"),
                        "item_name": goods.name,
                        "new_price_formatted_html": NRS.formatAmount(transaction.attachment.priceNQT) + " " + NRS.getChain(transaction.chain).name,
                        "seller": NRS.getAccountFormatted(goods, "seller")
                    };

                    infoTable.find("tbody").append(NRS.createInfoTable(data));
                    infoTable.show();

                    if (!isModalVisible) {
                        $("#transaction_info_modal").modal("show");
                    }
                    NRS.fetchingModalData = false;
                });
            } else if (NRS.isOfType(transaction, "DigitalGoodsQuantityChange")) {
                async = true;
                NRS.sendRequest("getDGSGood", {
                    "goods": transaction.attachment.goods
                }, function (goods) {
                    data = {
                        "type": $.t("marketplace_item_quantity_change"),
                        "item_name": goods.name,
                        "delta_quantity": transaction.attachment.deltaQuantity,
                        "seller": NRS.getAccountFormatted(goods, "seller")
                    };

                    infoTable.find("tbody").append(NRS.createInfoTable(data));
                    infoTable.show();

                    if (!isModalVisible) {
                        $("#transaction_info_modal").modal("show");
                    }
                    NRS.fetchingModalData = false;
                });
            } else if (NRS.isOfType(transaction, "DigitalGoodsPurchase")) {
                async = true;
                NRS.sendRequest("getDGSGood", {
                    "goods": transaction.attachment.goods
                }, function (goods) {
                    data = {
                        "type": $.t("marketplace_purchase"),
                        "item_name": goods.name,
                        "price": transaction.attachment.priceNQT,
                        "quantity_formatted_html": NRS.format(transaction.attachment.quantity),
                        "buyer": NRS.getAccountFormatted(transaction, "sender"),
                        "seller": NRS.getAccountFormatted(goods, "seller")
                    };

                    infoTable.find("tbody").append(NRS.createInfoTable(data));
                    infoTable.show();

                    NRS.sendRequest("getDGSPurchase", {
                        "purchase": NRS.fullHashToId(transaction.fullHash)
                    }, function (purchase) {
                        var callout = "";
                        if (purchase.errorCode) {
                            if (purchase.errorCode == 4) {
                                if (transactionDetails.block == "unconfirmed") {
                                    callout = $.t("unconfirmed_transaction");
                                } else {
                                    callout = $.t("incorrect_purchase");
                                }
                            } else {
                                callout = NRS.escapeRespStr(purchase.errorDescription);
                            }
                        } else {
                            if (NRS.account == transaction.recipient || NRS.account == transaction.sender) {
                                if (purchase.pending) {
                                    if (NRS.account == transaction.recipient) {
                                        callout = "<a href='#' data-toggle='modal' data-target='#dgs_delivery_modal' data-purchase='" + NRS.fullHashToId(transaction.fullHash) + "'>" + $.t("deliver_goods_q") + "</a>";
                                    } else {
                                        callout = $.t("waiting_on_seller");
                                    }
                                } else {
                                    if (purchase.refundNQT) {
                                        callout = $.t("purchase_refunded");
                                    } else {
                                        callout = $.t("purchase_delivered");
                                    }
                                }
                            }
                        }
                        if (callout) {
                            $("#transaction_info_bottom").html("<div class='callout " + (purchase.errorCode ? "callout-danger" : "callout-info") + " callout-bottom'>" + callout + "</div>").show();
                        }
                        if (!isModalVisible) {
                            $("#transaction_info_modal").modal("show");
                        }
                        NRS.fetchingModalData = false;
                    });
                });
            } else if (NRS.isOfType(transaction, "DigitalGoodsDelivery")) {
                async = true;
                NRS.sendRequest("getDGSPurchase", {
                    "purchase": transaction.attachment.purchase
                }, function (purchase) {
                    NRS.sendRequest("getDGSGood", {
                        "goods": purchase.goods
                    }, function (goods) {
                        data = {
                            "type": $.t("marketplace_delivery"),
                            "item_name": goods.name,
                            "price": purchase.priceNQT
                        };

                        data["quantity_formatted_html"] = NRS.format(purchase.quantity);

                        if (purchase.quantity != "1") {
                            var orderTotal = NRS.formatAmount(new BigInteger(String(purchase.quantity)).multiply(new BigInteger(String(purchase.priceNQT))));
                            data["total_formatted_html"] = orderTotal + " " + NRS.getChain(transaction.chain).name;
                        }

                        if (transaction.attachment.discountNQT) {
                            data["discount"] = transaction.attachment.discountNQT;
                        }

                        data["buyer"] = NRS.getAccountFormatted(purchase, "buyer");
                        data["seller"] = NRS.getAccountFormatted(purchase, "seller");

                        if (transaction.attachment.goodsData) {
                            NRS.tryToDecrypt(transaction, {
                                "goodsData": {
                                    "title": $.t("data"),
                                    "nonce": "goodsNonce"
                                }
                            }, NRS.getAccountForDecryption(purchase, "buyer", "seller"));
                        }

                        infoTable.find("tbody").append(NRS.createInfoTable(data));
                        infoTable.show();

                        var callout;

                        if (NRS.account == purchase.buyer) {
                            if (purchase.refundNQT) {
                                callout = $.t("purchase_refunded");
                            } else if (!purchase.feedbackNote) {
                                callout = $.t("goods_received") + " <a href='#' data-toggle='modal' data-target='#dgs_feedback_modal' data-purchase='" + NRS.escapeRespStr(transaction.attachment.purchase) + "'>" + $.t("give_feedback_q") + "</a>";
                            }
                        } else if (NRS.account == purchase.seller && purchase.refundNQT) {
                            callout = $.t("purchase_refunded");
                        }

                        if (callout) {
                            $("#transaction_info_bottom").append("<div class='callout callout-info callout-bottom'>" + callout + "</div>").show();
                        }

                        if (!isModalVisible) {
                            $("#transaction_info_modal").modal("show");
                        }
                        NRS.fetchingModalData = false;
                    });
                });
            } else if (NRS.isOfType(transaction, "DigitalGoodsFeedback")) {
                async = true;
                NRS.sendRequest("getDGSPurchase", {
                    "purchase": transaction.attachment.purchase
                }, function (purchase) {
                    NRS.sendRequest("getDGSGood", {
                        "goods": purchase.goods
                    }, function (goods) {
                        data = {
                            "type": $.t("marketplace_feedback"),
                            "item_name": goods.name,
                            "buyer": NRS.getAccountFormatted(purchase, "buyer"),
                            "seller": NRS.getAccountFormatted(purchase, "seller")
                        };

                        infoTable.find("tbody").append(NRS.createInfoTable(data));
                        infoTable.show();

                        if (purchase.seller == NRS.account || purchase.buyer == NRS.account) {
                            NRS.sendRequest("getDGSPurchase", {
                                "purchase": transaction.attachment.purchase
                            }, function (purchase) {
                                var callout;
                                if (purchase.buyer == NRS.account) {
                                    if (purchase.refundNQT) {
                                        callout = $.t("purchase_refunded");
                                    }
                                } else {
                                    if (!purchase.refundNQT) {
                                        callout = "<a href='#' data-toggle='modal' data-target='#dgs_refund_modal' data-purchase='" + NRS.escapeRespStr(transaction.attachment.purchase) + "'>" + $.t("refund_this_purchase_q") + "</a>";
                                    } else {
                                        callout = $.t("purchase_refunded");
                                    }
                                }
                                if (callout) {
                                    $("#transaction_info_bottom").append("<div class='callout callout-info callout-bottom'>" + callout + "</div>").show();
                                }
                                if (!isModalVisible) {
                                    $("#transaction_info_modal").modal("show");
                                }
                                NRS.fetchingModalData = false;
                            });
                        } else {
                            if (!isModalVisible) {
                                $("#transaction_info_modal").modal("show");
                            }
                            NRS.fetchingModalData = false;
                        }
                    });
                });
            } else if (NRS.isOfType(transaction, "DigitalGoodsRefund")) {
                async = true;
                NRS.sendRequest("getDGSPurchase", {
                    "purchase": transaction.attachment.purchase
                }, function (purchase) {
                    NRS.sendRequest("getDGSGood", {
                        "goods": purchase.goods
                    }, function (goods) {
                        data = {
                            "type": $.t("marketplace_refund"),
                            "item_name": goods.name
                        };
                        var orderTotal = new BigInteger(String(purchase.quantity)).multiply(new BigInteger(String(purchase.priceNQT)));
                        data["order_total_formatted_html"] = NRS.formatAmount(orderTotal) + " " + NRS.getChain(transaction.chain).name;
                        data["refund"] = transaction.attachment.refundNQT;
                        data["buyer"] = NRS.getAccountFormatted(purchase, "buyer");
                        data["seller"] = NRS.getAccountFormatted(purchase, "seller");
                        infoTable.find("tbody").append(NRS.createInfoTable(data));
                        infoTable.show();
                        if (!isModalVisible) {
                            $("#transaction_info_modal").modal("show");
                        }
                        NRS.fetchingModalData = false;
                    });
                });

            } else if (NRS.isOfType(transaction, "EffectiveBalanceLeasing")) {
                data = {
                    "type": $.t("balance_leasing"),
                    "period": transaction.attachment.period,
                    "lessee": transaction.recipientRS ? transaction.recipientRS : transaction.recipient
                };

                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "SetPhasingOnly")) {
                data = {
                    "type": $.t("phasing_only")
                };
                NRS.getPhasingDetails(data, transaction.attachment.phasingControlParams);
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (transaction.type == 5) { // Currency
                async = true;
                var currency = null;
                var id = (transaction.subtype == 0 ? NRS.fullHashToId(transaction.fullHash) : transaction.attachment.currency);
                NRS.sendRequest("getCurrency", {
                    "currency": id
                }, function (response) {
                    if (!response.errorCode) {
                        currency = response;
                    }
                }, {isAsync: false});
                if (NRS.isOfType(transaction, "CurrencyIssuance")) {
                    var minReservePerUnitNQT = new BigInteger(transaction.attachment.minReservePerUnitNQT).multiply(new BigInteger("" + Math.pow(10, transaction.attachment.decimals)));
                    data = {
                        "type": $.t("currency_issuance"),
                        "name": transaction.attachment.name,
                        "code": transaction.attachment.code,
                        "currency_type": transaction.attachment.type,
                        "description_formatted_html": transaction.attachment.description.autoLink(),
                        "initial_units": [transaction.attachment.initialSupplyQNT, transaction.attachment.decimals],
                        "reserve_units": [transaction.attachment.reserveSupplyQNT, transaction.attachment.decimals],
                        "max_units": [transaction.attachment.maxSupplyQNT, transaction.attachment.decimals],
                        "decimals": transaction.attachment.decimals,
                        "issuance_height": transaction.attachment.issuanceHeight,
                        "min_reserve_per_unit_formatted_html": NRS.formatAmount(minReservePerUnitNQT) + " " + NRS.getChain(transaction.chain).name,
                        "minDifficulty": transaction.attachment.minDifficulty,
                        "maxDifficulty": transaction.attachment.maxDifficulty,
                        "algorithm": transaction.attachment.algorithm
                    };
                    if (currency) {
                        data["current_units"] = NRS.convertToQNTf(currency.currentSupplyQNT, currency.decimals);
                        var currentReservePerUnitNQT = new BigInteger(currency.currentReservePerUnitNQT).multiply(new BigInteger("" + Math.pow(10, currency.decimals)));
                        data["current_reserve_per_unit_formatted_html"] = NRS.formatAmount(currentReservePerUnitNQT) + " " + NRS.getChain(transaction.chain).name;
                    } else {
                        data["status"] = "Currency Deleted or not Issued";
                    }
                } else if (NRS.isOfType(transaction, "ReserveIncrease")) {
                    if (currency) {
                        var amountPerUnitNQT = new BigInteger(transaction.attachment.amountPerUnitNQT).multiply(new BigInteger("" + Math.pow(10, currency.decimals)));
                        var resSupply = currency.reserveSupplyQNT;
                        data = {
                            "type": $.t("reserve_increase"),
                            "code": currency.code,
                            "reserve_units": [resSupply, currency.decimals],
                            "amount_per_unit_formatted_html": NRS.formatAmount(amountPerUnitNQT) + " " + NRS.getChain(transaction.chain).name,
                            "reserved_amount_formatted_html": NRS.formatAmount(NRS.multiply(amountPerUnitNQT, NRS.convertToQNTf(resSupply, currency.decimals))) + " " + NRS.getChain(transaction.chain).name
                        };
                    } else {
                        data = NRS.getUnknownCurrencyData(transaction);
                    }
                } else if (NRS.isOfType(transaction, "ReserveClaim")) {
                    if (currency) {
                        var reservePerUnitNQT = new BigInteger(currency.currentReservePerUnitNQT).multiply(new BigInteger("" + Math.pow(10, currency.decimals)));
                        data = {
                            "type": $.t("reserve_claim"),
                            "code": currency.code,
                            "unitsQNT": [transaction.attachment.unitsQNT, currency.decimals],
                            "claimed_amount_formatted_html": NRS.formatAmount(NRS.convertToQNTf(NRS.multiply(reservePerUnitNQT, transaction.attachment.unitsQNT), currency.decimals)) + " " + NRS.getChain(transaction.chain).name
                        };
                    } else {
                        data = NRS.getUnknownCurrencyData(transaction);
                    }
                } else if (NRS.isOfType(transaction, "CurrencyTransfer")) {
                    if (currency) {
                        data = {
                            "type": $.t("currency_transfer"),
                            "code": currency.code,
                            "unitsQNT": [transaction.attachment.unitsQNT, currency.decimals]
                        };
                    } else {
                        data = NRS.getUnknownCurrencyData(transaction);
                    }
                } else if (NRS.isOfType(transaction, "PublishExchangeOffer")) {
                    if (currency) {
                        data = NRS.formatCurrencyOffer(currency, transaction);
                    } else {
                        data = NRS.getUnknownCurrencyData(transaction);
                    }
                } else if (NRS.isOfType(transaction, "ExchangeBuy")) {
                    if (currency) {
                        data = NRS.formatCurrencyExchange(currency, transaction, "buy");
                    } else {
                        data = NRS.getUnknownCurrencyData(transaction);
                    }
                } else if (NRS.isOfType(transaction, "ExchangeSell")) {
                    if (currency) {
                        data = NRS.formatCurrencyExchange(currency, transaction, "sell");
                    } else {
                        data = NRS.getUnknownCurrencyData(transaction);
                    }
                } else if (NRS.isOfType(transaction, "CurrencyMinting")) {
                    if (currency) {
                        data = {
                            "type": $.t("mint_currency"),
                            "code": currency.code,
                            "unitsQNT": [transaction.attachment.unitsQNT, currency.decimals],
                            "counter": transaction.attachment.counter,
                            "nonce": transaction.attachment.nonce
                        };
                    } else {
                        data = NRS.getUnknownCurrencyData(transaction);
                    }
                } else if (NRS.isOfType(transaction, "CurrencyDeletion")) {
                    if (currency) {
                        data = {
                            "type": $.t("delete_currency"),
                            "code": currency.code
                        };
                    } else {
                        data = NRS.getUnknownCurrencyData(transaction);
                    }
                }
                if (!incorrect) {
                    if (transaction.sender != NRS.account) {
                        data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
                    }
                    var infoCallout = $("#transaction_info_callout");
                    infoCallout.html("");
                    if (currency != null && NRS.isExchangeable(currency.type)) {
                        infoCallout.append("<a href='#' data-goto-currency='" + NRS.escapeRespStr(currency.code) + "'>" + $.t('exchange_booth') + "</a><br/>");
                    }
                    if (currency != null && NRS.isReservable(currency.type)) {
                        infoCallout.append("<a href='#' data-toggle='modal' data-target='#currency_founders_modal' data-currency='" + NRS.escapeRespStr(currency.currency) + "' data-name='" + NRS.escapeRespStr(currency.name) + "' data-code='" + NRS.escapeRespStr(currency.code) + "' data-ressupply='" + NRS.escapeRespStr(currency.reserveSupplyQNT) + "' data-initialsupply='" + NRS.escapeRespStr(currency.initialSupplyQNT) + "' data-decimals='" + NRS.escapeRespStr(currency.decimals) + "' data-minreserve='" + NRS.escapeRespStr(currency.minReservePerUnitNQT) + "' data-issueheight='" + NRS.escapeRespStr(currency.issuanceHeight) + "'>View Founders</a><br/>");
                    }
                    if (currency != null) {
                        infoCallout.append("<a href='#' data-toggle='modal' data-target='#currency_distribution_modal' data-code='" + NRS.escapeRespStr(currency.code) + "'  data-i18n='Currency Distribution'>Currency Distribution</a>");
                    }
                    infoCallout.show();

                    infoTable.find("tbody").append(NRS.createInfoTable(data));
                    infoTable.show();

                    if (!isModalVisible) {
                        $("#transaction_info_modal").modal("show");
                    }
                    NRS.fetchingModalData = false;
                }
            } else if (NRS.isOfType(transaction, "TaggedDataUpload")) {
                data = NRS.getTaggedData(transaction.attachment, 0, transaction);
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "ShufflingCreation")) {
                data = {
                    "type": $.t("shuffling_creation"),
                    "period": transaction.attachment.registrationPeriod,
                    "holdingType": transaction.attachment.holdingType
                };
                if (transaction.attachment.holding != "0") {
                    var requestType;
                    if (data.holdingType == 1) {
                        requestType = "getAsset";
                    } else if (data.holdingType == 2) {
                        requestType = "getCurrency";
                    }
                    NRS.sendRequest(requestType, {"currency": transaction.attachment.holding, "asset": transaction.attachment.holding}, function (response) {
                        data.holding_formatted_html = NRS.getHoldingLink(transaction.attachment.holding, data.holdingType);
                        data.amount_formatted_html = NRS.convertToQNTf(transaction.attachment.amount, response.decimals);
                    }, { isAsync: false });
                } else {
                    data.amount = transaction.attachment.amount;
                }
                NRS.sendRequest("getShufflingParticipants", { "shufflingFullHash": transaction.fullHash }, function (response) {
                    if (response.participants && response.participants.length > 0) {
                        var rows = "<table class='table table-striped'><thead><tr>" +
                        "<th>" + $.t("participant") + "</th>" +
                        "<th>" + $.t("state") + "</th>" +
                        "<tr></thead><tbody>";
                        for (i = 0; i < response.participants.length; i++) {
                            var participant = response.participants[i];
                            rows += "<tr>" +
                            "<td>" + NRS.getAccountLink(participant, "account") + "</td>" +
                            "<td>" + $.t(NRS.getShufflingParticipantState(participant.state).toLowerCase()) + "</td>" +
                            "</tr>";
                        }
                        rows += "</tbody></table>";
                        data["participants_formatted_html"] = rows;
                    } else {
                        data["participants"] = $.t("no_matching_participants");
                    }
                }, { isAsync: false });
                NRS.sendRequest("getShufflers", {
                    "shufflingFullHash": transaction.fullHash,
                    "account": NRS.accountRS,
                    "adminPassword": NRS.getAdminPassword()
                }, function (response) {
                    if (response.shufflers && response.shufflers.length > 0) {
                        var shuffler = response.shufflers[0];
                        data["shuffler"] = "running";
                        data["shufflerRecipient_formatted_html"] = NRS.getAccountLink(shuffler, "recipient");
                        if (shuffler.failedTransaction) {
                            data["failedTransaction_formatted_html"] = NRS.getAccountLink(shuffler, "recipient");
                            data["failureCause"] = shuffler.failureCause;
                        }
                        data["fee_ratio_formatted_html"] = NRS.formatQuantity(shuffler.feeRateNQTPerFXT, NRS.getChain(shuffler.chain).decimals) +
                            " [" + NRS.getChain(shuffler.chain).name + "/" + NRS.getParentChainName() + "]";
                    } else {
                        if (response.errorCode) {
                            data["shuffler"] = $.t("unknown");
                        } else {
                            data["shuffler"] = $.t("not_started");
                        }
                    }
                }, { isAsync: false });
                NRS.sendRequest("getShuffling", {
                    "shufflingFullHash": transaction.fullHash
                }, function (response) {
                    if (response.shufflingFullHash) {
                        data["stage_formatted_html"] = NRS.getShufflingStage(response.stage);
                        data["count"] = response.registrantCount + " / " + response.participantCount;
                        data["blocksRemaining"] = response.blocksRemaining;
                        data["issuer_formatted_html"] = NRS.getAccountLink(response, "issuer");
                        if (response.assignee) {
                            data["assignee_formatted_html"] = NRS.getAccountLink(response, "assignee");
                        }
                        data["shufflingStateHash"] = response.shufflingStateHash;
                        if (response.recipientPublicKeys && response.recipientPublicKeys.length > 0) {
                            data["recipients_formatted_html"] = listPublicKeys(response.recipientPublicKeys);
                        }
                    }
                }, { isAsync: false });
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "ShufflingRegistration")) {
                data = { "type": $.t("shuffling_registration") };
                NRS.mergeMaps(transaction.attachment, data, { "version.ShufflingRegistration": true });
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "ShufflingProcessing")) {
                data = { "type": $.t("shuffling_processing") };
                NRS.mergeMaps(transaction.attachment, data, { "version.ShufflingProcessing": true });
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "ShufflingRecipients")) {
                data = {
                    "type": $.t("shuffling_recipients"),
                    "shuffling_state_hash": transaction.attachment.shufflingStateHash
                };
                data["shuffling_formatted_html"] = NRS.getTransactionLink(transaction.attachment.shufflingFullHash);
                data["recipients_formatted_html"] = listPublicKeys(transaction.attachment.recipientPublicKeys);
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "ShufflingVerification")) {
                data = { "type": $.t("shuffling_verification") };
                NRS.mergeMaps(transaction.attachment, data, { "version.ShufflingVerification": true });
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "ShufflingCancellation")) {
                data = { "type": $.t("shuffling_cancellation") };
                NRS.mergeMaps(transaction.attachment, data, { "version.ShufflingCancellation": true });
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "ChildChainBlock")) {
                data = {
                    "type": $.t("child_chain_block"),
                    "chain": NRS.constants.CHAIN_PROPERTIES[transaction.attachment.chain].name,
                    "hash": transaction.attachment.hash
                };
                var childTransactions = "";
                for (i = 0; i < transaction.attachment.childTransactionFullHashes.length; i++) {
                    childTransactions = NRS.getTransactionLink(transaction.attachment.childTransactionFullHashes[i], null, false, transaction.attachment.chain) + "<p>";
                }
                data.transactions_formatted_html = childTransactions;
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            } else if (NRS.isOfType(transaction, "CoinExchangeOrderIssue") || NRS.isOfType(transaction, "FxtCoinExchangeOrderIssue")) {
                NRS.formatCoinOrder(transaction, isModalVisible);
            } else if (NRS.isOfType(transaction, "CoinExchangeOrderCancel") || NRS.isOfType(transaction, "FxtCoinExchangeOrderCancel")) {
                data = {
                    "type": $.t("cancel_coin_exchange_order")
                };
                data.order_formatted_html = NRS.getTransactionLink(transaction.attachment.orderHash);
                infoTable.find("tbody").append(NRS.createInfoTable(data));
                infoTable.show();
            }

            if (NRS.notOfType(transaction, "ArbitraryMessage")) {
                if (transaction.attachment) {
                    var transactionInfoOutputBottom = $("#transaction_info_output_bottom");
                    if (transaction.attachment.message) {
                        if (!transaction.attachment["version.Message"] && !transaction.attachment["version.PrunablePlainMessage"]) {
                            try {
                                message = converters.hexStringToString(transaction.attachment.message);
                            } catch (err) {
                                //legacy
                                if (transaction.attachment.message.indexOf("feff") === 0) {
                                    message = NRS.convertFromHex16(transaction.attachment.message);
                                } else {
                                    message = NRS.convertFromHex8(transaction.attachment.message);
                                }
                            }
                        } else {
                            if (NRS.isTextMessage(transaction)) {
                                message = String(transaction.attachment.message);
                            } else {
                                message = $.t("binary_data")
                            }
                        }

                        transactionInfoOutputBottom.append("<div style='padding-left:5px;'><label><i class='fa fa-unlock'></i> " + $.t("public_message") + "</label><div>" + NRS.escapeRespStr(message).nl2br() + "</div></div>");
                    }

                    if (transaction.attachment.encryptedMessage || (transaction.attachment.encryptToSelfMessage && NRS.account == transaction.sender)) {
                        var account;
                        if (transaction.attachment.message) {
                            transactionInfoOutputBottom.append("<div style='height:5px'></div>");
                        }
                        if (transaction.attachment.encryptedMessage) {
                            fieldsToDecrypt.encryptedMessage = $.t("encrypted_message");
                            account = NRS.getAccountForDecryption(transaction);
                        }
                        if (transaction.attachment.encryptToSelfMessage && NRS.account == transaction.sender) {
                            fieldsToDecrypt.encryptToSelfMessage = $.t("note_to_self");
                            account = transaction.sender;
                        }
                        NRS.tryToDecrypt(transaction, fieldsToDecrypt, account, {
                            "formEl": "#transaction_info_output_bottom",
                            "outputEl": "#transaction_info_output_bottom"
                        });
                    }

                    transactionInfoOutputBottom.show();
                }
            }

            if (incorrect) {
                $.growl($.t("error_unknown_transaction_type"), {
                    "type": "danger"
                });

                NRS.fetchingModalData = false;
                return;
            }

            if (!async) {
                if (!isModalVisible) {
                    $("#transaction_info_modal").modal("show");
                }
                NRS.fetchingModalData = false;
            }
        } catch (e) {
            NRS.fetchingModalData = false;
            throw e;
        }
    };

    NRS.formatAssetOrder = function (asset, transaction, isModalVisible) {
        var data = {
            "type": (transaction.subtype == 2 ? $.t("ask_order_placement") : $.t("bid_order_placement")),
            "asset_formatted_html": NRS.getEntityLink({ request: "getAsset", key: "asset", id: transaction.attachment.asset }),
            "asset_name": asset.name,
            "quantity": [transaction.attachment.quantityQNT, asset.decimals],
            "price_formatted_html": NRS.formatQuantity(transaction.attachment.priceNQT, NRS.getChain(transaction.chain).decimals) + " " + NRS.getChain(transaction.chain).name,
            "total_formatted_html": NRS.formatQuantity(NRS.multiply(transaction.attachment.quantityQNT, transaction.attachment.priceNQT), asset.decimals + NRS.getChain(transaction.chain).decimals) + " " + NRS.getChain(transaction.chain).name
        };
        data["sender"] = transaction.senderRS ? transaction.senderRS : transaction.sender;
        var rows = "";
        var params;
        if (NRS.isOfType(transaction, "AskOrderPlacement")) {
            params = {"askOrderFullHash": transaction.fullHash};
        } else {
            params = {"bidOrderFullHash": transaction.fullHash};
        }
        var transactionField = (NRS.isOfType(transaction, "AskOrderPlacement") ? "bidOrderFullHash" : "askOrderFullHash");
        NRS.sendRequest("getOrderTrades", params, function (response) {
            var tradeQuantity = BigInteger.ZERO;
            var tradeTotal = BigInteger.ZERO;
            if (response.trades && response.trades.length > 0) {
                rows = "<table class='table table-striped'><thead><tr>" +
                "<th>" + $.t("date") + "</th>" +
                "<th>" + $.t("quantity") + "</th>" +
                "<th>" + $.t("price") + "</th>" +
                "<th>" + $.t("total") + "</th>" +
                "<tr></thead><tbody>";
                for (var i = 0; i < response.trades.length; i++) {
                    var trade = response.trades[i];
                    tradeQuantity = tradeQuantity.add(new BigInteger(trade.quantityQNT));
                    tradeTotal = tradeTotal.add(new BigInteger(trade.quantityQNT).multiply(new BigInteger(trade.priceNQT)));
                    rows += "<tr>" +
                    "<td>" + NRS.getTransactionLink(trade[transactionField], NRS.formatTimestamp(trade.timestamp)) + "</td>" +
                    "<td>" + NRS.formatQuantity(trade.quantityQNT, asset.decimals) + "</td>" +
                    "<td>" + NRS.formatQuantity(trade.priceNQT, NRS.getActiveChainDecimals()) + "</td>" +
                    "<td>" + NRS.formatQuantity(NRS.multiply(trade.quantityQNT, trade.priceNQT), asset.decimals + NRS.getActiveChainDecimals()) +
                    "</td>" +
                    "</tr>";
                }
                rows += "</tbody></table>";
                data["trades_formatted_html"] = rows;
            } else {
                data["trades"] = $.t("no_matching_trade");
            }
            data["quantity_traded"] = [tradeQuantity, asset.decimals];
            data["total_traded"] = NRS.formatQuantity(tradeTotal, asset.decimals + NRS.getActiveChainDecimals()) + " " + NRS.getChain(transaction.chain).name;
        }, { isAsync: false });

        var infoTable = $("#transaction_info_table");
        infoTable.find("tbody").append(NRS.createInfoTable(data));
        infoTable.show();
        if (!isModalVisible) {
            $("#transaction_info_modal").modal("show");
        }
        NRS.fetchingModalData = false;
    };

    NRS.formatCurrencyExchange = function (currency, transaction, type) {
        var rateUnitsStr = " [ " + currency.code + " / " + NRS.getChain(transaction.chain).name + " ]";
        var data = {
            "type": type == "sell" ? $.t("sell_currency") : $.t("buy_currency"),
            "code": currency.code,
            "unitsQNT": [transaction.attachment.unitsQNT, currency.decimals],
            "rate": NRS.formatQuantity(transaction.attachment.rateNQT, NRS.getChain(transaction.chain).decimals) + rateUnitsStr
        };
        var rows = "";
        NRS.sendRequest("getExchangesByExchangeRequest", {
            "transaction": NRS.fullHashToId(transaction.fullHash)
        }, function (response) {
            var exchangedUnits = BigInteger.ZERO;
            var exchangedTotal = BigInteger.ZERO;
            if (response.exchanges && response.exchanges.length > 0) {
                rows = "<table class='table table-striped'><thead><tr>" +
                "<th>" + $.t("date") + "</th>" +
                "<th>" + $.t("units") + "</th>" +
                "<th>" + $.t("rate") + "</th>" +
                "<th>" + $.t("total") + "</th>" +
                "<tr></thead><tbody>";
                for (var i = 0; i < response.exchanges.length; i++) {
                    var exchange = response.exchanges[i];
                    exchangedUnits = exchangedUnits.add(new BigInteger(exchange.unitsQNT));
                    exchangedTotal = exchangedTotal.add(new BigInteger(exchange.unitsQNT).multiply(new BigInteger(exchange.rateNQT)));
                    rows += "<tr>" +
                    "<td>" + NRS.getTransactionLink(exchange.offerFullHash, NRS.formatTimestamp(exchange.timestamp)) + "</td>" +
                    "<td>" + NRS.formatQuantity(exchange.unitsQNT, currency.decimals) + "</td>" +
                    "<td>" + NRS.formatQuantity(exchange.rateNQT, NRS.getChain(transaction.chain).decimals) + "</td>" +
                    "<td>" + NRS.formatQuantity(NRS.multiply(exchange.unitsQNT, exchange.rateNQT), currency.decimals + NRS.getChain(transaction.chain).decimals) +
                    "</td>" +
                    "</tr>";
                }
                rows += "</tbody></table>";
                data["exchanges_formatted_html"] = rows;
            } else {
                data["exchanges"] = $.t("no_matching_exchange_offer");
            }
            data["units_exchanged"] = [exchangedUnits, currency.decimals];
            data["total_exchanged"] = NRS.formatQuantity(exchangedTotal, currency.decimals + NRS.getChain(transaction.chain).decimals) + " [" + NRS.getChain(transaction.chain).name + "]";
        }, { isAsync: false });
        return data;
    };

    NRS.formatCurrencyOffer = function (currency, transaction) {
        var rateUnitsStr = " [ " + currency.code + " / " + NRS.getChain(transaction.chain).name + " ]";
        var buyOffer;
        var sellOffer;
        NRS.sendRequest("getOffer", {
            "offer": NRS.fullHashToId(transaction.fullHash)
        }, function (response) {
            buyOffer = response.buyOffer;
            sellOffer = response.sellOffer;
        }, { isAsync: false });
        var data = {};
        if (buyOffer && sellOffer) {
            data = {
                "type": $.t("exchange_offer"),
                "code": currency.code,
                "buy_supply_formatted_html": NRS.formatQuantity(buyOffer.supplyQNT, currency.decimals) + " (initial: " + NRS.formatQuantity(transaction.attachment.initialBuySupplyQNT, currency.decimals) + ")",
                "buy_limit_formatted_html": NRS.formatQuantity(buyOffer.limitQNT, currency.decimals) + " (initial: " + NRS.formatQuantity(transaction.attachment.totalBuyLimitQNT, currency.decimals) + ")",
                "buy_rate_formatted_html": NRS.formatQuantity(transaction.attachment.buyRateNQT, NRS.getChain(transaction.chain).decimals) + rateUnitsStr,
                "sell_supply_formatted_html": NRS.formatQuantity(sellOffer.supplyQNT, currency.decimals) + " (initial: " + NRS.formatQuantity(transaction.attachment.initialSellSupplyQNT, currency.decimals) + ")",
                "sell_limit_formatted_html": NRS.formatQuantity(sellOffer.limitQNT, currency.decimals) + " (initial: " + NRS.formatQuantity(transaction.attachment.totalSellLimitQNT, currency.decimals) + ")",
                "sell_rate_formatted_html": NRS.formatQuantity(transaction.attachment.sellRateNQT, NRS.getChain(transaction.chain).decimals) + rateUnitsStr,
                "expiration_height": transaction.attachment.expirationHeight
            };
        } else {
            data["offer"] = $.t("no_matching_exchange_offer");
        }
        var rows = "";
        NRS.sendRequest("getExchangesByOffer", {
            "offer": NRS.fullHashToId(transaction.fullHash)
        }, function (response) {
            var exchangedUnits = BigInteger.ZERO;
            var exchangedTotal = BigInteger.ZERO;
            if (response.exchanges && response.exchanges.length > 0) {
                rows = "<table class='table table-striped'><thead><tr>" +
                "<th>" + $.t("date") + "</th>" +
                "<th>" + $.t("type") + "</th>" +
                "<th>" + $.t("units") + "</th>" +
                "<th>" + $.t("rate") + "</th>" +
                "<th>" + $.t("total") + "</th>" +
                "<tr></thead><tbody>";
                for (var i = 0; i < response.exchanges.length; i++) {
                    var exchange = response.exchanges[i];
                    exchangedUnits = exchangedUnits.add(new BigInteger(exchange.unitsQNT));
                    exchangedTotal = exchangedTotal.add(new BigInteger(exchange.unitsQNT).multiply(new BigInteger(exchange.rateNQT)));
                    var exchangeType = exchange.seller == transaction.sender ? "Buy" : "Sell";
                    if (exchange.seller == exchange.buyer) {
                        exchangeType = "Same";
                    }
                    rows += "<tr>" +
                    "<td>" + NRS.getTransactionLink(exchange.transactionFullHash, NRS.formatTimestamp(exchange.timestamp)) + "</td>" +
                    "<td>" + exchangeType + "</td>" +
                    "<td>" + NRS.formatQuantity(exchange.unitsQNT, currency.decimals) + "</td>" +
                    "<td>" + NRS.formatQuantity(exchange.rateNQT, NRS.getChain(transaction.chain).decimals) + "</td>" +
                    "<td>" + NRS.formatQuantity(NRS.multiply(exchange.unitsQNT, exchange.rateNQT), currency.decimals + NRS.getChain(transaction.chain).decimals) +
                    "</td>" +
                    "</tr>";
                }
                rows += "</tbody></table>";
                data["exchanges_formatted_html"] = rows;
            } else {
                data["exchanges"] = $.t("no_matching_exchange_request");
            }
            data["units_exchanged"] = [exchangedUnits, currency.decimals];
            data["total_exchanged"] = NRS.formatQuantity(exchangedTotal, currency.decimals + NRS.getChain(transaction.chain).decimals) + " [" + NRS.getChain(transaction.chain).name + "]";
        }, { isAsync: false });
        return data;
    };

    NRS.getUnknownCurrencyData = function (transaction) {
        if (!transaction) {
            return {};
        }
        return {
            "status": "Currency Deleted or not Issued",
            "type": transaction.type,
            "subType": transaction.subtype
        };
    };

    NRS.formatCoinOrder = function(transaction, isModalVisible) {
        var data = {
            "type": $.t("issue_coin_exchange_order")
        };
        data.chain_formatted_html = NRS.getChainLink(transaction.attachment.chain);
        data.exchange_chain_formatted_html = NRS.getChainLink(transaction.attachment.exchangeChain);
        var exchangeChainDecimals = NRS.getChain(transaction.attachment.exchangeChain).decimals;
        data.amount_formatted_html = NRS.formatQuantity(transaction.attachment.quantityQNT, exchangeChainDecimals) + " " + NRS.getChain(transaction.attachment.exchangeChain).name;
        var chainDecimals = NRS.getChain(transaction.attachment.chain).decimals;
        data.price_formatted_html = NRS.formatQuantity(transaction.attachment.priceNQT, chainDecimals)  + " " + NRS.getChain(transaction.attachment.chain).name;
        var rows = "";
        NRS.sendRequest("getCoinExchangeTrades", {
            chain: transaction.attachment.chain,
            exchange: transaction.attachment.exchangeChain,
            orderFullHash: transaction.fullHash
        }, function (response) {
            var tradeQuantity = BigInteger.ZERO;
            var tradeTotal = BigInteger.ZERO;
            if (response.trades && response.trades.length > 0) {
                rows = "<table class='table table-striped'><thead><tr>" +
                    "<th>" + $.t("date") + "</th>" +
                    "<th>" + $.t("amount") + "</th>" +
                    "<th>" + $.t("price") + "</th>" +
                    "<th>" + $.t("total") + "</th>" +
                    "<tr></thead><tbody>";
                for (var i = 0; i < response.trades.length; i++) {
                    var trade = response.trades[i];
                    tradeQuantity = tradeQuantity.add(new BigInteger(trade.quantityQNT));
                    tradeTotal = tradeTotal.add(new BigInteger(NRS.multiply(trade.quantityQNT, trade.priceNQT)));
                    rows += "<tr>" +
                        "<td>" + NRS.getTransactionLink(trade.matchFullHash, NRS.formatTimestamp(trade.timestamp), false, transaction.attachment.exchangeChain) + "</td>" +
                        "<td>" + NRS.formatQuantity(trade.quantityQNT, exchangeChainDecimals) + "</td>" +
                        "<td>" + NRS.formatQuantity(trade.priceNQT, chainDecimals) + "</td>" +
                        "<td>" + NRS.formatQuantity(NRS.multiply(trade.quantityQNT, trade.priceNQT), chainDecimals + exchangeChainDecimals) +
                        "</td>" +
                        "</tr>";
                }
                rows += "</tbody></table>";
                data["trades_formatted_html"] = rows;
            } else {
                data["trades"] = $.t("no_matching_trade");
            }
            data["total_exchange_formatted_html"] = NRS.formatQuantity(tradeQuantity, exchangeChainDecimals) +  " " + NRS.getChain(transaction.attachment.exchangeChain).name;
            data["total_chain_formatted_html"] = NRS.formatQuantity(tradeTotal, chainDecimals + exchangeChainDecimals) + " " + NRS.getChain(transaction.chain).name;
        }, { isAsync: false });

        var infoTable = $("#transaction_info_table");
        infoTable.find("tbody").append(NRS.createInfoTable(data));
        infoTable.show();
        if (!isModalVisible) {
            $("#transaction_info_modal").modal("show");
        }
        NRS.fetchingModalData = false;
    };

    NRS.getTaggedData = function (attachment, subtype, transaction) {
        var data = {
            "type": $.t(NRS.transactionTypes[6].subTypes[subtype].i18nKeyTitle)
        };
        if (attachment.hash) {
            data["hash"] = attachment.hash;
        }
        if (attachment.taggedData) {
            data["tagged_data_formatted_html"] = "TODO"; // TODO
            transaction = attachment.taggedData;
        }
        if (attachment.data) {
            data["name"] = attachment.name;
            data["description"] = attachment.description;
            data["tags"] = attachment.tags;
            data["mime_type"] = attachment.type;
            data["channel"] = attachment.channel;
            data["is_text"] = attachment.isText;
            data["filename"] = attachment.filename;
            if (attachment.isText) {
                data["data_size"] = NRS.getUtf8Bytes(attachment.data).length;
            } else {
                data["data_size"] = converters.hexStringToByteArray(attachment.data).length;
            }
        }
        if (transaction.block) {
            data["link_formatted_html"] = NRS.getTaggedDataLink(transaction.fullHash, transaction.chain, attachment.isText);
        }
        return data;
    };

    function listPublicKeys(publicKeys) {
        var rows = "<table class='table table-striped'><tbody>";
        for (var i = 0; i < publicKeys.length; i++) {
            var recipientPublicKey = publicKeys[i];
            var recipientAccount = {accountRS: NRS.getAccountIdFromPublicKey(recipientPublicKey, true)};
            rows += "<tr>" +
                "<td>" + NRS.getAccountLink(recipientAccount, "account") + "<td>" +
                "</tr>";
        }
        rows += "</tbody></table>";
        return rows;
    }

    $(document).on("click", ".approve_transaction_btn", function (e) {
        e.preventDefault();
        var approveTransactionModal = $('#approve_transaction_modal');
        approveTransactionModal.find('.at_transaction_full_hash_display').text($(this).data("transaction"));
        approveTransactionModal.find('.at_transaction_timestamp').text(NRS.formatTimestamp($(this).data("timestamp")));
        $("#approve_transaction_button").data("transaction", $(this).data("transaction"));
        approveTransactionModal.find('#at_transaction_full_hash').val($(this).data("fullhash"));

        var mbFormatted = $(this).data("minBalanceFormatted");
        var minBalanceWarning = $('#at_min_balance_warning');
        if (mbFormatted && mbFormatted != "") {
            minBalanceWarning.find('.at_min_balance_amount').html(mbFormatted);
            minBalanceWarning.show();
        } else {
            minBalanceWarning.hide();
        }
        var revealSecretDiv = $("#at_revealed_secret_div");
        if ($(this).data("votingmodel") == NRS.constants.VOTING_MODELS.HASH) {
            revealSecretDiv.show();
        } else {
            revealSecretDiv.hide();
        }
    });

    $("#approve_transaction_button").on("click", function () {
        $('.tr_transaction_' + $(this).data("transaction") + ':visible .approve_transaction_btn').attr('disabled', true);
    });

    $("#transaction_info_modal").on("hide.bs.modal", function () {
        NRS.removeDecryptionForm($(this));
        $("#transaction_info_output_bottom, #transaction_info_output_top, #transaction_info_bottom").html("").hide();
    });

    return NRS;
}(NRS || {}, jQuery));
