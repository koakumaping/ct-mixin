import {
  isString,
  hasChinese,
  isArray,
  isObject,
  hasOwn,
  toNumber,
  clone,
} from 'ct-util'
import { mapGetters, mapMutations } from 'vuex'
import emitter from './emitter'
import upload from './upload'
import search from './search'
import userMixins from './user'
import responseMixins from './response'
import validatorMixins from './validator'
import systemMixins from './system'

// 节点就是树的第一层，第二层是部门，第三层是人员
// 0 节点多选, 至少选择一个
// 1 节点单选, 只能选择一个
// 2 节点不可选, 不需要选择节点, 人员前才能有选择框
const getTreeNode = (type = '') => {
  const treeNode = {
    attr: {},
    id: '',
    name: '',
    open: true,
    disabled: type === 2,
    children: [],
  }

  return treeNode
}

const walkFlowTree = (tree = [], parent = [], type = '') => {
  tree.forEach((child) => {
    const treeNode = getTreeNode(type)
    treeNode.id = child.attr.id
    treeNode.name = child.data.title
    treeNode.attr = clone(child.attr)
    treeNode.checked = child.attr.checked
    if (hasOwn(child, 'children') && child.children.length > 0) {
      walkFlowTree(child.children, treeNode.children, type)
    } else {
      delete treeNode.children
      treeNode.disabled = false
    }
    parent.push(clone(treeNode))
  })
}

export default {
  mixins: [
    emitter,
    validatorMixins,
    userMixins,
    responseMixins,
    search,
    upload,
    systemMixins,
  ],
  data() {
    return {
      dd: {},
      loading: false,
      // 要删除的Id
      deleteId: '',
      // 要编辑的Id
      editId: '',
      // 默认模板
      template: {},
      // 流程信息
      flowinfo: {
        labelList: [],
        view: [],
        sateguid: '',
      },
      // 表名（主表）
      tableName: '',
      // 子表
      childTableName: '',
      // form表单
      form: {},
      // 附加的表单（暂时有薪资）
      otherForm: {},
      // 子表, 用于新增, 编辑
      childForm: {},
      // 所有子表删除列表
      childFormDeleteList: {},
      // 不做数据还原的子表
      ignoreChildFormList: [],
      searchForm: {
        id: '',
        boxid: '',
        flowid: '',
        workflowid: '',
      },
      // 流程返回信息
      flowResponse: {},
      // 流程树
      flowTree: [],
      // 选中的子节点
      flowTreeList: [],
      // 流程节点状态, 用于判断节点的单双选
      singleStatus: 0,
      // 是否要走流程
      doFlow: false,
      // 是否呆在该页面
      stay: false,
      // 数据修改列表
      formChangeList: [],
      changeItemExample: {
        id: '',
        childid: '',
        columnname: '',
        columnvalue: '',
        oldcolumnvalue: '',
        tablename: '',
      },
      // 除了rows之外依旧要返回给后台的数据
      customConfig: {},
      // 1 不退回， 2 退回
      rejectFlow: 1,
      // 人员列表
      nameList: [],
    }
  },
  computed: {
    ...mapGetters([
      'flow',
    ]),
    routerName() {
      // if (this.name === this.$route.name) return this.$route.name
      return this.$options.name
    },
    id() {
      return this.$route.query.id || this.searchForm.id || -1
    },
    boxid() {
      return this.$route.query.boxid || ''
    },
    flowid() {
      return this.$route.query.flowid || ''
    },
    flowuid() {
      return this.flowinfo.sateguid
    },
    isStartFlow() {
      const uuidList = ['', 'nostartflow']
      if (uuidList.indexOf(this.flowuid) > -1) return true
      return false
    },
    notStartFlow() {
      return !this.isStartFlow
    },
    workflowid() {
      return this.$route.query.workflowid || ''
    },
    inDialog() {
      return false
    },
    isBasic() {
      return this.$route.meta.basic
    },
    singleSelection() {
      if (this.singleStatus === 1) return true
      return false
    },
    hasId() {
      if (this.isBasic) return true
      return this.id > 0
    },
    noId() {
      return !this.hasId
    },
    // 附件相关数据
    attachment() {
      return {
        list: this.attachmentList,
        template: this.template.attachment,
        candel: this.getP('AttachMent', 'candel'),
        readonly: this.getP('AttachMent', 'readonly'),
        edit: this.getP('AttachMent', 'edit'),
        noId: this.noId,
      }
    },
  },
  methods: {
    ...mapMutations({
      showFlow: 'SHOW_FLOW',
      hideFlow: 'HIDE_FLOW',
    }),
    showLoading() {
      this.findComponentDownward(this, 'modularWarp').showSpin()
    },
    hideLoading() {
      this.findComponentDownward(this, 'modularWarp').hideSpin()
    },
    showError(payload) {
      this.findComponentDownward(this, 'modularWarp').showError(payload)
    },
    requestQuery() {
      const _query = Object.assign({}, this.searchForm, this.urlQuery)
      for (const key in _query) {
        const str = _query[key]
        if (str && isString(str)) {
          // 删除原先数组加在最后的逗号
          if (str.charAt(str.length - 1) === ',') {
            _query[key] = _query[key].substring(0, _query[key].length - 1)
          }
          // 中文做特殊处理
          if (hasChinese(_query[key])) {
            _query[key] = encodeURI(_query[key], 'UTF-8')
          }
        }
        if (isArray(str)) {
          _query[key] = _query[key].toString()
        }
      }
      // 处理id默认值为-1
      if (_query.id === '') _query.id = -1
      // 保证t在末尾
      delete _query.t
      _query.t = +new Date()
      return _query
    },
    // 将原始数据转换成前端能方便使用的数据
    handleResults(payload) {
      if (!payload.data) return false
      const _payload = clone(payload)
      const dd = clone(this.getData(_payload.data))
      // 自动获取主表table name
      this.tableName = Object.keys(_payload.data)[0]
      this.template = this.handleTemplate(payload.datatemplate)
      // 处理子表中的需要返回给后台的数据
      try {
        this.customConfig[this.tableName] = payload.data[this.tableName].customsetconfig
        const cData = payload.data[this.tableName]
        if (cData.rows && isArray(cData.rows) && cData.rows.length > 0) {
          const c = cData.rows[0]
          for (const key in c) {
            if (key.indexOf('tbl') === 0 || key.indexOf('type3') === 0) {
              this.customConfig[key] = c[key].customsetconfig
            }
          }
        }
      } catch (error) {
        console.log(error)
      }
      // 其他表单 存储薪资
      this.otherForm = payload.Wages
      this.handleDictionaries(payload.dictionaries)
      this.handleAttachmentList(payload.attachment)
      this.handleFlowInfo(_payload.flowinfo)
      this.handlePermission(dd)
      return this.handleForm(_payload)
    },
    // 简化form数据
    handleForm(payload) {
      const _data = this.getData(payload.data, true)
      this.form = _data.rows[0] || {}
      for (const key in this.form) {
        if (key.indexOf('tbl') === 0 || key.indexOf('type3') === 0) {
          this.childFormDeleteList[key] = []
          this.handleChildPermission(key, this.form[key].purview)
          this.form[key] = this.form[key].rows
        }
      }
      // 原始数据，对比用
      this.dd = this._.clone(this.form) || {}
      return _data
    },
    // 处理流程信息中相关按钮
    handleFlowInfo(payload = {}) {
      this.flowinfo = payload
      const p = this.p
      p.flowback = !!toNumber(this.flowinfo.backbut)
      p.flowsave = !!toNumber(this.flowinfo.savebut)
      p.flowsend = !!toNumber(this.flowinfo.sendbut)
      p.flowcheck = !!toNumber(this.flowinfo.isshowpartsendcheck)
    },
    // 把原始数据跟前端改写过的数据进行融合
    handleDd(tableName = this.tableName, payload = this.form) {
      const _payload = clone(payload)
      // _payload.rows = this.restoreFrom(_payload)
      // _payload = this.restoreChildFrom(_payload)

      for (const key in _payload) {
        if (key.indexOf('tbl') === 0 || key.indexOf('type3') === 0) {
          _payload[key] = {
            type: '3',
            value: {
              rows: _payload[key],
              delrows: this.childFormDeleteList[key],
            },
          }

          if (hasOwn(this.customConfig, key)) {
            _payload[key].customsetconfig = this.customConfig[key]
          }
        }
      }

      const _dd = {}
      _dd[tableName] = {
        rows: [],
      }
      if (hasOwn(this.customConfig, this.tableName)) {
        _dd[tableName].customsetconfig = this.customConfig[this.tableName]
      }
      // _dd[tableName] = _payload
      _dd[tableName].rows[0] = _payload
      _dd.attachment = this.attachmentList
      _dd.Wages = this.otherForm
      _dd.currentflowinfo = clone(this.flowinfo)
      // _dd.currentflowinfo.flowresult = []
      // this.flowinfo.view.forEach((item) => {
      //   _dd.currentflowinfo.flowresult.push(this.handleFlowResult(item.flowresult))
      // })

      return _dd
    },
    // 处理流程日志
    handleFlowResult(flowresult) {
      const result = clone(flowresult)
      if (hasOwn(result, 'showlist') && isArray(result.showlist)) {
        result.showlist.forEach((child) => {
          if (child.value === result.value) result.text = child.txt
        })
      }
      return result
    },
    // 发送流程信息，取得接下来走流程要用到的数据，然后展示出来供用户选择
    handleFlow(flowinfo = this.flowinfo, flag = false) {
      const {
        boxid,
        flowid,
        workflowid,
        childworkflowid,
        currentuserid,
        currentusername,
        currentdeptid,
        currentdeptname,
      } = flowinfo

      const formdata = {
        Id: flowinfo.id,
        flag: flag ? 2 : 1,
        boxid,
        flowid,
        workflowid,
        childworkflowid,
        currentuserid,
        currentusername,
        currentdeptid,
        currentdeptname,
      }

      if (hasOwn(flowinfo, 'PartSendId')) formdata.PartSendId = flowinfo.PartSendId
      if (hasOwn(flowinfo, 'FilterColumn')) formdata.FilterColumn = flowinfo.FilterColumn

      this.r().post('flow', formdata).then(response => {
        this.flowResponse = response
        this.flowTree = []

        // const arr = []
        const treedata = this.flowResponse.treedata
        // 处理节点选择状态
        this.singleStatus = toNumber(treedata.statesingle)
        walkFlowTree(treedata.data, this.flowTree, this.singleStatus)
        // this.flowTree = arr
        // this.$refs.flow.show()
        // this.$emit('on-close')
        const flow = {
          response: this.flowResponse,
          tree: this.flowTree,
          singleSelection: this.singleStatus,
        }
        this.showFlow(flow)
        this.rejectFlow = 1
        this.loading = false
      }).catch(error => {
        // 防止新增时出错，产生多次点击的问题
        this.saveClose()
      })
    },
    // 还原主表数据
    restoreFrom() {
      return this._.restoreResponse([this.form])
    },
    // 还原子表数据
    restoreChildFrom(payload) {
      const childFormDeleteList = this.childFormDeleteList
      const _payload = clone(payload)

      for (const key in this.form) {
        if (key.indexOf('tbl') === 0 || key.indexOf('type3') === 0) {
          const needRestore = !this.ignoreChildFormList.includes(key)
          console.log(needRestore, key)
          _payload.rows[0][key] = {
            type: '3',
            value: {
              rows: needRestore ? this._.restoreResponse(this.form[key]) : this.form[key],
              delrows: needRestore ?
                this._.restoreResponse(childFormDeleteList[key]) : childFormDeleteList[key],
            },
          }
        }
      }
      return _payload
    },
    // 获取详情
    getDetail(routerName = this.routerName) {
      this.showLoading()
      return new Promise((resolve, reject) => {
        this.r().get(routerName, { params: this.requestQuery() }).then(response => {
          this.handleResults(response)
          this.hideLoading()
          resolve(response)
        }).catch(error => {
          if (error.errcode && error.errcode === 3) this.showError(error)
          reject(error)
        })
      })
    },
    getNormalDetail(routerName = this.routerName) {
      this.showLoading()
      return new Promise((resolve, reject) => {
        this.r().get(routerName, { params: this.requestQuery() }).then(response => {
          resolve(response)
          this.hideLoading()
        }).catch(error => {
          reject(error)
        })
      })
    },
    getGlobalList(name = '', options = {}, callback = () => {}) {
      if (!name || this._.isEmptyObject(options)) {
        console.warn('getGlobalList need name or option')
        return false
      }

      const formdata = {
        key: name,
        pagesize: 20,
        pageindex: 1,
        allowpageing: 0,
        querymodel: options,
      }
      return new Promise((resolve, reject) => {
        this.r().post('globalSearch', formdata).then(response => {
          callback(response.Rows)
          resolve(response.Rows)
        })
      })
    },
    getPeopleGlobalList(name = '', options = {}) {
      if (!name || this._.isEmptyObject(options)) {
        console.warn('getPeopleGlobalList need name or option')
        return false
      }

      const formdata = {
        key: name,
        pagesize: 20,
        pageindex: 1,
        allowpageing: 0,
        querymodel: options,
      }

      return new Promise((resolve, reject) => {
        this.r().post('peopleSearch', formdata).then(response => {
          resolve(response.Rows)
        })
      })
    },
    getGlobalDictList(name = '', options = {}) {
      if (!name || this._.isEmptyObject(options)) {
        return false
      }

      const formdata = {
        key: name,
        pagesize: 20,
        pageindex: 1,
        allowpageing: 0,
        querymodel: options,
      }
      return new Promise((resolve, reject) => {
        this.r().post('globalDictSearch', formdata).then(response => {
          resolve(response)
        })
      })
    },
    isShowAttachment(attachmentLength = 0, isVisible = false, isEdit = false) {
      if (!isVisible) return false
      if (attachmentLength === 0 && !isEdit) return false
      return true
    },
    saveChildFrom(payload, formName = this.childTableName) {
      // 判断是编辑还是新增
      if (payload.edit) {
        this.$set(this.form[formName], this.editId, payload.form)
        return false
      }
      this.form[formName].push(this._.clone(payload.form))
    },
    // 往子表中的插一条数据
    addToChildFormList(formName = this.childTableName) {
      this.form[formName].push(this._.clone(this.template[formName]))
    },
    // 删除子表中的一条数据
    deleteFromChildFormList(formName, index = '') {
      console.log(formName, index)
      let deleteId = this.deleteId
      if (this._.isNumber(index)) deleteId = index
      // 如果Id不是 -1, 删除后放入子表删除列表
      if (this.form[formName][deleteId].Id !== -1) {
        this.childFormDeleteList[formName] = [
          ...this.childFormDeleteList[formName],
          ...this.form[formName].splice(deleteId, 1),
        ]
      } else {
        // 直接删除
        this.form[formName].splice(deleteId, 1)
      }
    },
    // 保存成功后的关闭处理
    saveClose() {
      if (!this.isBasic) {
        this.$router.go(-1)
      }
    },
    // 显示子表弹窗
    showChildForm(formName, index) {
      if (!formName) {
        console.warn('showChildForm need formName')
        return false
      }
      if (this._.isNumber(index)) {
        this.editId = index
        this.childForm = clone(this.form[formName][index])
      } else {
        this.editId = ''
        this.childForm = clone(this.template[formName])
      }
      this.$refs[formName].show()
    },
    // 隐藏子表弹窗
    hideChildForm(formName, payload) {
      if (!formName) {
        console.warn('hideChidForm need formName')
        return false
      }
      this.saveChildFrom(payload, formName)
      this.$refs[formName].hide()
      this.editId = ''
    },
    // 提交之前的操作，默认返回False 表示继续下面的流程
    handleSubmit() {
      return false
    },
    isBasicType(payload) {
      if (isObject(payload)) return false
      if (isArray(payload)) return false
      return true
    },
    // 对比数据差异
    handleDiff() {
      this.changeItemExample.tablename = this.tableName

      for (const key in this.form) {
        const currentValue = this.form[key]
        const originValue = this.dd[key]
        if (key.indexOf('tbl') === -1  || key.indexOf('type3') === -1) {
          console.log('table', key, originValue, currentValue)
          if (originValue !== currentValue && this.isBasicType(currentValue)) {
            const _item = this._.clone(this.changeItemExample)
            _item.id = this.id
            _item.columnname = key
            _item.columnvalue = currentValue
            _item.oldcolumnvalue = originValue
            this.formChangeList.push(_item)
          }
        } else {
          console.log('childTable', key, originValue, currentValue)
          this.handleChildDiff(key, originValue, currentValue)
        }
      }
    },
    handleChildDiff(name, originList = [], list = []) {
      console.log(list, name)
      if (list.length === 0) return false
      // 原始数据生成id列表，用于查询
      const idList = originList.map(line => line.Id)

      const getIndex = id => idList.indexOf(id)

      // 遍历现有数据，进行对比
      list.forEach(line => {
        if (getIndex(line.Id) === -1) return false
        const origin = originList[getIndex(line.Id)]
        for (const key in line) {
          const currentValue = line[key]
          const originValue = origin[key]
          console.log(name, key, currentValue, originValue)
          if (currentValue !== originValue && this.isBasicType(currentValue)) {
            const _item = this._.clone(this.changeItemExample)
            _item.id = this.id
            _item.childid = line.Id
            _item.columnname = key
            _item.columnvalue = currentValue
            _item.oldcolumnvalue = originValue
            this.formChangeList.push(_item)
          }
        }
      })
    },
    // 提交数据 保存时不走流程
    async submit(doFlow = this.doFlow, handleDd = true, routerName = this.routerName) {
      if (this.handleSubmit()) return false
      const pass = await this.formCheckError('form')
      if (!pass) return false
      let params = {
        Id: this.id,
        tt: isString(doFlow) ? doFlow : doFlow ? 'submit' : 'save',
      }

      params = Object.assign(params, this.requestQuery())
      if (this._.hasOwn(params, 'id')) delete params.id
      const formdata = handleDd ? this.handleDd(this.tableName) : this.form

      this.loading = true
      // this.handleDiff()
      formdata.modifylog = this.formChangeList

      return new Promise((resolve, reject) => {
        const sucessCallback = (response) => {
          this.p.flowsave = false
          this.p.flowsend = false
          if (doFlow) {
            const flowinfo = response.flowinfo || this.flowinfo
            this.handleFlow(flowinfo, isString(doFlow))
          } else {
            if (this.isBasic) {
              this.$notice.success({
                content: '保存成功',
                closeTime: 1000,
              })
            }

            if (this._.isFunction(this.afterSubmit)) this.afterSubmit(response)
            this.loading = false
            if (!this.stay) this.saveClose()
          }
          resolve(response)
        }

        if (this.hasId) {
          this.r().post(routerName, formdata, { params }).then(response => {
            sucessCallback(response)
          }).catch(error => {
            this.loading = false
            reject()
          })
        } else {
          this.r().put(routerName, formdata, { params }).then(response => {
            sucessCallback(response)
          }).catch(error => {
            this.loading = false
            reject()
          })
        }
      })
    },
    // 提交数据 保存时不走流程
    async normalSubmit(doFlow = this.doFlow) {
      await this.submit(doFlow, false)
    },
    // 提交数据 退回
    async rejectSubmit() {
      this.rejectFlow = 2
      await this.submit('reject', true, this.routerName)
    },
    setName(key, value, index = -1) {
      let line = this.form
      if (index > -1) line = this.form[this.childTableName][index]
      line[key] = isArray(value.label) ? value.label[0] : value.label
    },
    getNameList(payload) {
      if (isEmpty(payload)) {
        this.nameList = []
        return false
      }
      const options = {
        name: payload,
        RetNewFormat: 1,
        ContainDelUser: 0,
      }
      this.getPeopleGlobalList('User', options).then(response => {
        this.nameList = response
      })
    },
  },
}