import axios from 'axios'

const userServiceUrl = 'http://localhost:8080'

export function loginUser(username, password) {
    return axios.post( userServiceUrl + '/user/login', {
        username: username,
        password: password
    })
}