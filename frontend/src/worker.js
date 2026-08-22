import { handleApi } from './server/router'

export default {
  fetch(request, env) {
    const path = new URL(request.url).pathname
    return path.startsWith('/api/') ? handleApi(request, env) : env.ASSETS.fetch(request)
  },
}
