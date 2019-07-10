// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');
const { ComponentDialog, DialogSet, DialogTurnStatus, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');
const { BookingDialog } = require('./bookingDialog');
const { LuisHelper } = require('./luisHelper');
const axios = require('axios')

const userServiceUrl = 'http://localhost:8080'
const roomServiceUrl = 'http://localhost:8082'
const reserveServiceUrl = 'http://localhost:8081'

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';
const BOOKING_DIALOG = 'bookingDialog';

class MainDialog extends ComponentDialog {
    constructor(logger) {
        super('MainDialog');

        if (!logger) {
            logger = console;
            logger.log('[MainDialog]: logger not passed in, defaulting to console');
        }

        this.logger = logger;

        // Define the main dialog and its related components.
        // This is a sample "book a flight" dialog.
        this.addDialog(new TextPrompt('TextPrompt'))
            .addDialog(new BookingDialog(BOOKING_DIALOG))
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.loginStep.bind(this),
                this.introStep.bind(this),
                this.actStep.bind(this),
                this.finalStep.bind(this)
            ]))
            
        this.initialDialogId = MAIN_WATERFALL_DIALOG;

    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async loginStep(stepContext) {
        await stepContext.context.sendActivity('this is login dialog')
        this.logger.log(stepContext)

        const userName = stepContext.context.activity.text.split('.')[0]
        const password = stepContext.context.activity.text.split('.')[1]

        this.logger.log('username : ', userName)
        this.logger.log('password : ', password)

        try {
            const ans = await axios.post(userServiceUrl + '/user/login' , {
                username: userName,
                password: password
            })
            this.logger.log(ans.data)

            let accessToken = ans.data.accessToken
            let refreshToken = ans.data.refreshToken

            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
            
            await stepContext.context.sendActivity('Login Success!!!')
            // Run the Dialog with the new message Activity.
            return await stepContext.next()
        } catch (err) {
            console.log(err)
            await stepContext.context.sendActivity('Login Failed\n Please re-enter username.password!!!')
        }     
    }

    /**
     * First step in the waterfall dialog. Prompts the user for a command.
     * Currently, this expects a booking request, like "book me a flight from Paris to Berlin on march 22"
     * Note that the sample LUIS model will only recognize Paris, Berlin, New York and London as airport cities.
     */
    async introStep(stepContext) {
        if (!process.env.LuisAppId || !process.env.LuisAPIKey || !process.env.LuisAPIHostName) {
            await stepContext.context.sendActivity('NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.');
            return await stepContext.next();
        }
        return await stepContext.prompt('TextPrompt', { prompt: 'What can I help you with today?\nSay something like "Book a room 2222 from 2am-3am on today' });
    }

    /**
     * Second step in the waterall.  This will use LUIS to attempt to extract the origin, destination and travel dates.
     * Then, it hands off to the bookingDialog child dialog to collect any remaining details.
     */
    async actStep(stepContext) {
        let bookingDetails = {};

        if (process.env.LuisAppId && process.env.LuisAPIKey && process.env.LuisAPIHostName) {
            // Call LUIS and gather any potential booking details.
            // This will attempt to extract the origin, destination and travel date from the user's message
            // and will then pass those values into the booking dialog
            bookingDetails = await LuisHelper.executeLuisQuery(this.logger, stepContext.context);
            //! temporary test place bc LUIS is down TT
            //check room name
            let roomName = '2222'
            const check = await axios.get(roomServiceUrl + '/room/check/' + roomName)
            console.log('roomId : ' + check.data)
            console.log("--------------------------------------------------------------")
            // book room API
            let roomId = check.data
          
            await axios.get(roomServiceUrl + '/room/checkDateTime', {
                params : {
                    roomId: roomId,
                    startDate: '2019-06-28T03:45:54.539Z',
                    endDate: '2019-06-28T04:45:00.434Z'
                }
            })
        
            await axios.post(roomServiceUrl + '/room/' + roomId + '/reserve', {
                startDate: '2019-06-28T03:45:54.539Z',
                endDate: '2019-06-28T04:45:00.434Z',
                title: 'Test'
            })

            stepContext.context.sendActivity('booking succeed')
            //!-----------------------------------------------------------------------
            this.logger.log('LUIS extracted these booking details:', bookingDetails);
        }

        // In this sample we only have a single intent we are concerned with. However, typically a scenario
        // will have multiple different intents each corresponding to starting a different child dialog.

        // Run the BookingDialog giving it whatever details we have from the LUIS call, it will fill out the remainder.
        return await stepContext.beginDialog('bookingDialog', bookingDetails);
    }

    /**
     * This is the final step in the main waterfall dialog.
     * It wraps up the sample "book a flight" interaction with a simple confirmation.
     */
    async finalStep(stepContext) {
        // If the child dialog ("bookingDialog") was cancelled or the user failed to confirm, the Result here will be null.
        if (stepContext.result) {
            const result = stepContext.result;
            //!---------------------------------------------------------------------
            try {
                let ans = await axios.post(reserveServiceUrl + '/reservation/current/confirm')
                console.log('ans : ' + ans)
            } catch (e) {
                console.log(e)
            }
          
            //!---------------------------------------------------------------------
            // Now we have all the booking details.
            // This is where calls to the booking AOU service or database would go.
            // If the call to the booking service was successful tell the user.
            const timeProperty = new TimexProperty(result.travelDate);
            const travelDateMsg = timeProperty.toNaturalLanguage(new Date(Date.now()));
            const msg = `I have you booked to ${ result.destination } from ${ result.origin } on ${ travelDateMsg }.`;
            await stepContext.context.sendActivity(msg);
        } else {
            await stepContext.context.sendActivity('Thank you.');
        }
        return await stepContext.endDialog();
    }
}

module.exports.MainDialog = MainDialog;
