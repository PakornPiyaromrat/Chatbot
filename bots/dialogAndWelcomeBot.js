// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { CardFactory } = require('botbuilder-core');
const { DialogBot } = require('./dialogBot');
const WelcomeCard = require('./resources/welcomeCard.json');
const LoginCard = require('./resources/loginCard.json')
const ChooseDateTime = require('./resources/chooseDateTime.json')

class DialogAndWelcomeBot extends DialogBot {
    constructor(conversationState, userState, dialog, logger) {
        super(conversationState, userState, dialog, logger);

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    const welcomeCard = CardFactory.adaptiveCard(WelcomeCard);
                    const loginCard = CardFactory.adaptiveCard(LoginCard)
                    const chooseDateTime = CardFactory.adaptiveCard(ChooseDateTime)
                    
                    await context.sendActivity({ attachments: [welcomeCard] });
                    await context.sendActivity({ attachments: [loginCard] })
                    await context.sendActivity({ attachments: [chooseDateTime] })

                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.DialogAndWelcomeBot = DialogAndWelcomeBot;
