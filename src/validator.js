export default {
  data() {
    return {
      rules: {},
    }
  },
  methods: {
    noEmptyValidator(rule, value, callback) {
      if (this._.isEmpty(value)) return callback(new Error('必填项'))
      callback()
    },
  },
}