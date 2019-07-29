const { ChoicePrompt, ComponentDialog, WaterfallDialog, TextPrompt, ConfirmPrompt } = require ("botbuilder-dialogs");
const axios = require('axios')

const reserveServiceUrl = 'http://localhost:8081'
const roomServiceUrl = 'http://localhost:8082'


const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';
const TEXT_PROMPT = 'textPrompt'

class ChooseDialog extends ComponentDialog {
    constructor() {
        super('chooseDialog')

        this.addDialog(new ChoicePrompt('ChoicePrompt'))
            .addDialog(new ConfirmPrompt('ConfirmPrompt'))
            .addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.introStep.bind(this),
                this.chooseStep.bind(this),
            ]))

        this.initialDialogId = MAIN_WATERFALL_DIALOG
    } 

    async introStep(stepContext) {
        return await stepContext.prompt('ChoicePrompt', { 
            prompt: 'What do you want to do?',
            listStyle: 3,
            choices: [
                {value: 'reserve room'},
                {value: 'see your reservation history'},
                {value: 'cancel your room'},
                {value: 'see available room'}
            ],
            retryPrompt: 'Please choose number below'
        })
        
    }

    async chooseStep(stepContext) {
        console.log(stepContext.result)
        const result = stepContext.result.value
        switch (result) {
            case 'reserve room' :
                try {
                    return stepContext.prompt(TEXT_PROMPT, { prompt: 'Say something like "book room 2222 from 5pm-6pm on today".' })
                } catch (err) {
                    console.log(err)
                    
                    stepContext.endDialog()
                }
            break

            case 'see your reservation history' :
                try {
                    return stepContext.prompt(TEXT_PROMPT, { prompt: 'say history'})
                } catch (err) {
                    console.log(err)
                    this.endDialog()
                }
            break
            
            case 'cancel your room' :
                //! get history
                const historyCancel = await axios.get(reserveServiceUrl + '/reservation/')
                console.log( historyCancel);
                console.log('--------------------------------------');
                //!------------------------------------------------------
                const arrayHistory = historyCancel.data.reservationHistory  
                const resultHistory = arrayHistory.map(arr => ({startDate: arr.summaryStartDate, endDate: arr.summaryEndDate}))
                console.log(arrayHistory);
                console.log('--------------------------------------');
                console.log(resultHistory.length);
                // const historyId = recognizerResult.entities.Reservation_ID
                // console.log('historyId : ' + historyId);

                if ( resultHistory.length < 1 ){
                    return await context.sendActivity('you never book a room')
                } else {
                    for ( let i = 0; i < resultHistory.length; i++ ) {
                        await stepContext.context.sendActivity(
                            'id : ' + arrayHistory[i]._id + '\t' +
                            'roomName : ' + arrayHistory[i].roomName + '\t' + 
                            'startDate : ' + arrayHistory[i].summaryStartDate + '\t' +
                            'endDate : ' + arrayHistory[i].summaryEndDate
                        )
                    }

                    try {
                        return await stepContext.prompt(TEXT_PROMPT, { prompt: 'say cancel {id}. (select id from above)'})
                    } catch (err) {
                        console.log(err)
                        stepContext.endDialog()
                    }
                }
            break

            case 'see available room' :
                //! get all room
                const allRoom = await axios.get(roomServiceUrl + '/room/')
                const res = allRoom.data.response
                const arrayReservation = allRoom.data.response.reservation
                
                console.log('-----------------------------');
                console.log(res);
                console.log('------------------------------------');
                console.log('roomLength : ' + res.length)
                console.log('------------------------------------');
                // console.log('arrayReservationLength : ' + arrayReservation.length);
                //! ---------------------------------------------------
                console.log(res[0].reservation.length);

                await stepContext.context.sendActivity('Time that is already reserved')

                for ( let i = 0; i < res.length; i++ ) {
                    for ( let j = 0; j < res[i].reservation.length; j++ ) {
                        console.log(i + ' ' + j)
                        if ( res[i].reservation.length < 1 ) {
                            console.log(res[i].roomName + 'this room do not have reservation')
                        } else {
                            console.log(res[i].roomName + 'this room has reservation')
                            await stepContext.context.sendActivity(
                                'roomName : ' + res[i].roomName + '\t' +
                                'startDate : ' + res[i].reservation[j].startDate + '\t' +
                                'endDate : ' + res[i].reservation[j].endDate
                            )
                        }
                    }
                }

                await stepContext.context.sendActivity('This is all the room we have')

                for ( let i = 0; i < res.length; i++ ) {
                    await stepContext.context.sendActivity(
                        'roomName ' + res[i].roomName
                    )
                }

                try {
                    return stepContext.prompt(TEXT_PROMPT, { prompt: 'say something like "available room 2222 from 5pm-6pm on today" '})
                } catch (err) {
                    console.log(err)
                    stepContext.endDialog()
                }
            break
        }
    }
}

module.exports.ChooseDialog = ChooseDialog
