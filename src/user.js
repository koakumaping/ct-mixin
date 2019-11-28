import { toNumber } from 'ct-util'
import store from 'store'
import cookie from 'js-cookie'

export default {
  data() {
    return {
      user: {
        id: toNumber(store.get('id')) || toNumber(cookie.get('id')),
        name: store.get('name') || toNumber(cookie.get('name')),
        deptId: toNumber(store.get('deptid')) || toNumber(cookie.get('name')),
        deptName: store.get('deptname') || toNumber(cookie.get('deptname')),
        agent: toNumber(store.get('agent')) || toNumber(cookie.get('agent')),
      },
    }
  },
}