// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { LuisRecognizer } = require('botbuilder-ai');
const { ConfirmPrompt, TextPrompt, DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');
const { ChooseDialog } = require('./chooseDialog')
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');

const axios = require('axios')

const CONFIRM_PROMPT = 'confirmPrompt';
const CHOOSE_DIALOG = 'chooseDialog'
const DATE_RESOLVER_DIALOG = 'dateResolverDialog';


const roomServiceUrl = 'http://localhost:8082'
const reserveServiceUrl = 'http://localhost:8081'

class LuisHelper extends CancelAndHelpDialog {
    constructor(id) {
        super(id || 'luisHelper')

        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new ChooseDialog(CHOOSE_DIALOG))
            .addDialog(new TextPrompt('TextPrompt'))
    }
    /**
     * Returns an object with preformatted LUIS results for the bot's dialogs to consume.
     * @param {*} logger
     * @param {TurnContext} context
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

    static async executeLuisQuery(logger, context, stepContext) {
        const bookingDetails = {};

        try {
            const recognizer = new LuisRecognizer({
                applicationId: process.env.LuisAppId,
                endpointKey: process.env.LuisAPIKey,
                endpoint: `https://${ process.env.LuisAPIHostName }`
            }, {}, true);

            const recognizerResult = await recognizer.recognize(context);

            //เลือก intent ที่คะแนนสูงสุด
            const intent = LuisRecognizer.topIntent(recognizerResult);

            bookingDetails.intent = intent;

            switch (intent) {
                case 'Book_Room' : 
                    // We need to get the result from the LUIS JSON which at every level returns an array

                    logger.log("intent : " + intent)
                    logger.log(recognizerResult)
                    console.log('----------------------------------')
                    logger.log(recognizerResult.entities.datetime)

                    let roomName = recognizerResult.entities.Room_Number
                   
                    if (!roomName) {
                        await context.sendActivity('please put room number you want to reserve')
                        // return await stepContext.endDialog()

                        return await stepContext.beginDialog('chooseDialog')
 
                    } else {
                        console.log('----------------------------------')
                        logger.log('roomName : ' + roomName)
                        console.log('----------------------------------')

                        //! API check roomName and sent roomId back
                        const check = await axios.get(roomServiceUrl + '/room/check/'+ roomName)
                        let roomId = check.data
                        if ( roomId === 'invalid roomName' ) {
                            await context.sendActivity('room not found please choose another room')
                            // return await stepContext.endDialog()
                            
                        }
                        console.log("roomId :  "+ roomId)
                        console.log('----------------------------------')
                        console.log(recognizerResult.luisResult.entities[1])
                        console.log('------------------------------------------')

                        bookingDetails.roomName = roomName

                        
                        if ( recognizerResult.luisResult.entities[1] == null || recognizerResult.luisResult.entities.length < 1 ) {
                            await context.sendActivity('need startDate & endDate')
                            
                            await stepContext.endDialog()
                            // return await stepContext.back()
                        } else {
                            let startDate = recognizerResult.luisResult.entities[1].resolution.values[0].start.replace(' ','T')
                            let endDate = recognizerResult.luisResult.entities[1].resolution.values[0].end.replace(' ','T')

                            console.log('startDate : ' + startDate + ' ' + 'endDate : ' + endDate)

                            bookingDetails.startDate = startDate
                            bookingDetails.endtDate = endDate

                            //getCreatingReservationByUserId
                            let get = await axios.get(reserveServiceUrl + '/reservation/current/')
                            console.log(get.data)

                            //! check dateTime status
                            let status = await axios.get(roomServiceUrl + '/room/checkDateTime', {
                                params : {
                                    roomId: roomId,
                                    startDate: startDate,
                                    endDate: endDate
                                }
                            })

                            console.log('roomstatus : ' + status.data)
                            if ( status.data == 'reserved' ) {
                                await context.sendActivity('room is already reserved please choose another room or time')
                                
                                // await stepContext.endDialog()
                                return await stepContext.beginDialog('chooseDialog')
                            } else if ( status.data == 'invalid time') {
                                await context.sendActivity('invalid time please choose another time')
                                // await stepContext.endDialog()
                                return await stepContext.beginDialog('chooseDialog')
                            } else {
                                // book room API 
                                let room = await axios.post(roomServiceUrl + '/room/' + roomId + '/reserve', {
                                    startDate: startDate,
                                    endDate: endDate,
                                    title: 'Test'
                                })
                                console.log('roomData : ' + room.data)
                                console.log('context : ' + context)
                                console.log('logger: ' + logger)
                                console.log('stepContext : ' + stepContext);

                                await context.sendActivity('API SENT')
                                
                                console.log(stepContext.result)
                                try {            
                                    let ans = await axios.post(reserveServiceUrl + '/reservation/current/confirm')
                                    console.log(ans.data)
                                    stepContext.context.sendActivity('Reservation Confirmed')
                                    
                                    return await stepContext.beginDialog('chooseDialog')

                                } catch (e) {
                                    logger.warn(e)
                                }
                                // return await stepContext.prompt(CONFIRM_PROMPT, { prompt: 'Are you sure to book this room?' });

                            }
                        }
                    }
                break;

                case 'Cancel' :
                    logger.log("intent : " + intent)
                    // //! get history
                    // const historyCancel = await axios.get(reserveServiceUrl + '/reservation/')
                    // console.log( historyCancel);
                    // console.log('--------------------------------------');

                    // const arrayHistory = historyCancel.data.reservationHistory  
                    // const resultHistory = arrayHistory.map(arr => ({startDate: arr.summaryStartDate, endDate: arr.summaryEndDate}))
                    // console.log(arrayHistory);
                    // console.log('--------------------------------------');
                    // console.log(resultHistory.length);
                    const historyId = recognizerResult.entities.Reservation_ID
                    console.log('historyId : ' + historyId);

                    // if ( resultHistory.length < 1 ){
                    //     return await context.sendActivity('you never book a room')
                    // } else {
                    //     for ( let i = 0; i < resultHistory.length; i++ ) {
                    //         await stepContext.context.sendActivity(
                    //             'id : ' + arrayHistory[i]._id + '\t' + 
                    //             'startDate : ' + arrayHistory[i].summaryStartDate + '\t' +
                    //             'endDate : ' + arrayHistory[i].summaryEndDate
                    //         )
                    //     }
                        
                        // await stepContext.prompt('TextPrompt', { prompt: 'please choose id you want to delete from above'})
                        //! delete reservation
                        let ansDel = await axios.delete(reserveServiceUrl + '/reservation/history/' + historyId)
                        console.log(ansDel.data)
                        await context.sendActivity('Deleted Reservation');
                        
                        await stepContext.endDialog()
                        return await stepContext.beginDialog('chooseDialog')
                    // }
                   
                break;

                case 'Help' :
                    context.sendActivity('Help Switch')
                break;

                case 'History' :
                    console.log('intent : ' + intent);
                    console.log('--------------------------------------');
                    //!---------------------------------------------------------------
                    const history = await axios.get(reserveServiceUrl + '/reservation/')
                    console.log( history);
                    console.log('--------------------------------------');

                    const array = history.data.reservationHistory
                    const result = array.map(arr => ({startDate: arr.summaryStartDate, endDate: arr.summaryEndDate}))
                    console.log(array);
                    
                    console.log('--------------------------------------');
                    console.log(result.length);

                    if ( result.length < 1 ){
                        return await context.sendActivity('you never book a room')
                    } else {
                        for ( let i = 0; i < result.length; i++ ) {
                            await stepContext.context.sendActivity(
                                'id : ' + array[i]._id + '\t' + 
                                'roomName : ' + array[i].roomName + '\t' +
                                'startDate : ' + array[i].summaryStartDate + '\t' +
                                'endDate : ' + array[i].summaryEndDate
                            )
                        }                      
                        return await stepContext.beginDialog('chooseDialog')
                    }
                       
                    // await stepContext.context.sendActivity(myJson);
                    // await stepContext.context.sendActivity(result);
                    //!---------------------------------------------------------------
                break

                case 'Available' :
                    console.log('intent :: ' + intent);
                    console.log('-----------------------------');

                break   
            }
        } catch (err) {
            logger.warn(`LUIS Exception: ${ err } Check your LUIS configuration`);
            context.sendActivity('failed to use LUIS')
        }
    }

    
    
}

module.exports.LuisHelper = LuisHelper;
