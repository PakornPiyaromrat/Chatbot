// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler } = require('botbuilder');
const axios = require('axios')

const userServiceUrl = 'http://localhost:8080'

class DialogBot extends ActivityHandler {
    /**
     *
     * @param {ConversationState} conversationState
     * @param {UserState} userState
     * @param {Dialog} dialog
     * @param {any} logger object for logging events, defaults to console if none is provided
     */
    constructor(conversationState, userState, dialog, logger) {
        super();
        if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
        if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');
        if (!logger) {
            logger = console;
            logger.log('[DialogBot]: logger not passed in, defaulting to console');
        }

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.logger = logger;
        this.dialogState = this.conversationState.createProperty('DialogState');

        this.onMessage(async (context, next) => {
            this.logger.log('Running dialog with Message Activity.');
            
            //Show text sent from user
            // this.logger.log(context.activity)

            // const userName = context.activity.text.split('.')[0]
            // const password = context.activity.text.split('.')[1]

            // this.logger.log('username : ', userName)
            // this.logger.log('password : ', password)

            await this.dialog.run(context, this.dialogState);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
            
            //Login API
            // try {
            //     const ans = await axios.post( userServiceUrl + '/user/login' , {
            //         username: userName,
            //         password: password
            //     })
            //     this.logger.log(ans.data)
                
            //     await context.sendActivity('Login Success!!!')
            //     // Run the Dialog with the new message Activity.
            //     await this.dialog.run(context, this.dialogState);

            //     // By calling next() you ensure that the next BotHandler is run.
            //     await next();
            // } catch {
            //     await context.sendActivity('Login Failed\n Please re-enter username.password!!!')
            // }
           
        });

        this.onDialog(async (context, next) => {
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.DialogBot = DialogBot;
