// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { LuisRecognizer } = require('botbuilder-ai');
const { ConfirmPrompt } = require('botbuilder-dialogs');

const axios = require('axios')

const CONFIRM_PROMPT = 'confirmPrompt';

const roomServiceUrl = 'http://localhost:8082'
const reserveServiceUrl = 'http://localhost:8081'

class LuisHelper {
    /**
     * Returns an object with preformatted LUIS results for the bot's dialogs to consume.
     * @param {*} logger
     * @param {TurnContext} context
     */
    static async executeLuisQuery(logger, context) {
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
                    console.log('----------------------------------')
                    logger.log('roomName : ' + roomName)
                    console.log('----------------------------------')

                    //API check roomName and sent roomId back
                    const check = await axios.get(roomServiceUrl + '/room/check/'+ roomName)
                    let roomId = check.data
                    console.log("roomId :  "+ roomId)
                    console.log('----------------------------------')

                    let startDate = recognizerResult.luisResult.entities[1].resolution.values[0].start.replace(' ','T')
                    let endDate = recognizerResult.luisResult.entities[1].resolution.values[0].end.replace(' ','T')

                    console.log(startDate)

                    console.log('startDate : ' + startDate + ' ' + 'endDate : ' + endDate)

                    bookingDetails.startDate = startDate     
                    bookingDetails.endtDate = endDate
                    
                    //getCreatingReservationByUserId
                    let get = await axios.get(reserveServiceUrl + '/reservation/current/')
                    console.log(get.data)

                    //check dateTime status
                    let status = await axios.get(roomServiceUrl + '/room/checkDateTime', {
                        params : {
                            roomId: roomId,
                            startDate: startDate,
                            endDate: endDate
                        }
                    })
                    console.log('roomstatus : ' + status.data)
                    if ( status == 'reserved' ) {
                        context.sendActivity('room is already reserved')
                    } else {
                        // book room API 
                        let room = await axios.post(roomServiceUrl + '/room/' + roomId + '/reserve', {
                            startDate: startDate,
                            endDate: endDate,
                            title: 'Test'
                        })
                        console.log(room.data)

                        await context.sendActivity('passed LUIS')

                        return await stepContext.prompt(CONFIRM_PROMPT, { prompt: 'Are you sure to book this room?' });
                    }
                break;

                case 'Cancel' :
                    context.sendActivity('Cancel Switch')
                break;

                case 'Help' :
                    context.sendActivity('Help Switch')
                break;
            }
        } catch (err) {
            logger.warn(`LUIS Exception: ${ err } Check your LUIS configuration`);
            context.sendActivity('failed to use LUIS')
        }
    }
}

module.exports.LuisHelper = LuisHelper;
