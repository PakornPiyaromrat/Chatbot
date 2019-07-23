const { TextPrompt, WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs')
const { MainDialog } = require('./mainDialog')
const { CancelAndHelpDialog } = require('./cancelAndHelpDialog');

const axios = require('axios')
const jwtDecode = require('jwt-decode')

const userServiceUrl = 'http://localhost:8080'

const MAIN_DIALOG = 'mainwaterfallDialog'

class LoginDialog  {
    
    static async loginStep(stepContext) {
        await stepContext.context.sendActivity('this is login dialog')

        const userName = stepContext.context.activity.text.split('.')[0]
        const password = stepContext.context.activity.text.split('.')[1]

        console.log('username : ', userName)
        console.log('password : ', password)

        try {
            const ans = await axios.post(userServiceUrl + '/user/login' , {
                username: userName,
                password: password
            })
            console.log(ans.data)

            let accessToken = ans.data.accessToken

            let decoded = jwtDecode(accessToken)
            let userId = decoded.userId
            console.log('userId : ' + userId)

            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
            
            await stepContext.context.sendActivity('Login Success!!!')
            // Run the Dialog with the new message Activity.
            // return await stepContext.beginDialog('mainWaterfallDialog')

            return await stepContext.next()
        } catch (err) {
            console.log(err)
            await stepContext.context.sendActivity('Login Failed\n Please re-enter username.password!!!')

        }     
    }

    
}

module.exports.LoginDialog = LoginDialog