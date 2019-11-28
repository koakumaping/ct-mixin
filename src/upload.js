export default {
  name: 'uploadMixins',
  data() {
    return {
      // 附件列表
      attachmentList: [],
    }
  },
  methods: {
    handleAttachmentList(payload) {
      this.attachmentList = payload
    },
    uploadSuccess(payload) {
      this.attachmentList.push(payload)
    },
  },
}