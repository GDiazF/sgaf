import axios from 'axios'

/** Cliente sin JWT para el portal público de reservas. */
const publicApi = axios.create({ baseURL: '/api/' })

export default publicApi
