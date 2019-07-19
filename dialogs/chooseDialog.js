const { ChoicePrompt, ComponentDialog, WaterfallDialog, TextPrompt, ConfirmPrompt } = require ("botbuilder-dialogs");

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
                {value: 'see your incoming reserve'},
                {value: 'cancel your room'},
                {value: 'see all room reserve timeline'}
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

            case 'see your incoming reserve' :
                stepContext.context.sendActivity('incoming reserve')
            break
            
            case 'cancel your room' :
                try {
                    return stepContext.prompt(TEXT_PROMPT, { prompt: 'Which room you want to cancel?'})
                } catch (err) {
                    console.log(err)
                    stepContext.endDialog()
                }
            break

            case 'see all room reserve timeline' :
                stepContext.context.sendActivity('see all room reserve timeline')
            break
        }
    }
}

module.exports.ChooseDialog = ChooseDialog
