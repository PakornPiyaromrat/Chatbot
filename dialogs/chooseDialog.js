const { ChoicePrompt, ComponentDialog } = require ("botbuilder-dialogs");
const builder = require('botbuilder')

const CHOICE_PROMPT = 'choicePrompt'

class ChooseDialog extends ComponentDialog {
    constructor() {
        super('chooseDialog')
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT))
    } 

    static async chooseStep(stepContext) {
        
        return await stepContext.prompt(CHOICE_PROMPT, 
            { prompt: 'What do you want?',
                listStyle: 3,
                choices: [
                    {value: '1'},
                    {value: '2'}
                ]
            }
        )

    }
}

module.exports.ChooseDialog = ChooseDialog