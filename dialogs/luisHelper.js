// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { LuisRecognizer } = require('botbuilder-ai');
const axios = require('axios')

const roomServiceUrl = 'http://localhost:8082'

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
                // logger.log(recognizerResult.luisResult)

                let roomName = recognizerResult.entities.Room_Number
                logger.log('roomName : ' + roomName)

                //API check roomName and sent roomId back
                const check = await axios.get(roomServiceUrl + '/room/check/'+ roomName)
                console.log("check = "+ check)

                // logger.log(recognizerResult.luisResult.entities[1].resolution.values[0])

                // แยก Start-End date&time
                // bookingDetails.startTime = LuisHelper.parseStartTime(recognizerResult)
                // bookingDetails.endTime = LuisHelper.parseEndTime(recognizerResult)
                bookingDetails.startDate = LuisHelper.parseStartDate(recognizerResult)
                bookingDetails.endtDate = LuisHelper.parseEndDate(recognizerResult)
                
                // book room API
                let roomId = '5cfdcb47c7ef830d2830b339'
                
                await axios.post(roomServiceUrl + '/room/' + roomId + '/reserve', {
                    startDate: '',
                    endDate: '',
                    title: ''
                })

                context.sendActivity('booking succeed')
                break;
            }
        } catch (err) {
            logger.warn(`LUIS Exception: ${ err } Check your LUIS configuration`);
            context.sendActivity('failed to use LUIS')
        }
        return bookingDetails;
    }

    static parseStartDate(result) {
        const startDate = result.luisResult.entities[1].resolution.values[0].start;
        
        // const startDate = datetimeEntity.split(" ")[0]

        return startDate
    }

    static parseStartTime(result) {
        const datetimeEntity = result.luisResult.entities[1].resolution.values[0].start;
        
        const startTime = datetimeEntity.split(" ")[1]
        
        return startTime
    }

    static parseEndDate(result) {
        const endDate = result.luisResult.entities[1].resolution.values[0].end;
        
        // const endDate = datetimeEntity.split(" ")[0]

        return endDate
    }

    static parseEndTime(result) {
        const datetimeEntity = result.luisResult.entities[1].resolution.values[0].end;
        
        const endTime = datetimeEntity.split(" ")[1]

        return endTime
    }
    
}

module.exports.LuisHelper = LuisHelper;
