// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { LuisRecognizer } = require('botbuilder-ai');

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

            if (intent === 'Book_Room') {
                // We need to get the result from the LUIS JSON which at every level returns an array

                logger.log("intent : " + intent)
                logger.log(recognizerResult.entities.datetime)
                logger.log(recognizerResult.luisResult.entities[0].resolution.values[0])
                const alpha = recognizerResult.luisResult.entities[0].resolution.values[0].start
                logger.log("alpha : " + alpha.split(" ")[0])

                bookingDetails.startTime = LuisHelper.parseStartTime(recognizerResult);
                bookingDetails.endTime = LuisHelper.parseStartDate(recognizerResult)
                bookingDetails.startDate = LuisHelper.parseEndDate(recognizerResult)
                bookingDetails.endtDate = LuisHelper.parseEndTime(recognizerResult)
                
            }
        } catch (err) {
            logger.warn(`LUIS Exception: ${ err } Check your LUIS configuration`);

            //show intent
            logger.log(intent)
        }
        return bookingDetails;
    }

    static parseStartDate(result) {
        const datetimeEntity = result.luisResult.entities[0].resolution.values[0].start;
        
        const startDate = datetimeEntity.split(" ")[0]

        return startDate
    }

    static parseStartTime(result) {
        const datetimeEntity = result.luisResult.entities[0].resolution.values[0].start;
        
        const startTime = datetimeEntity.split(" ")[1]
        
        return startTime
    }

    static parseEndDate(result) {
        const datetimeEntity = result.luisResult.entities[0].resolution.values[0].end;
        
        const endDate = datetimeEntity.split(" ")[0]

        return endDate
    }

    static parseEndTime(result) {
        const datetimeEntity = result.luisResult.entities[0].resolution.values[0].end;
        
        const endTime = datetimeEntity.split(" ")[1]

        return endTime
    }
    
}

module.exports.LuisHelper = LuisHelper;
