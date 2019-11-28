function getValueByPath(object, prop) {
  prop = prop || ''
  const paths = prop.split('.')
  let current = object
  let result = null
  for (let i = 0, j = paths.length; i < j; i++) {
    const path = paths[i]
    if (!current) break

    if (i === j - 1) {
      result = current[path]
      break
    }
    current = current[path]
  }
  return result
}

export default {
  name: 'permissionMixins',
  data() {
    return {
      p: {
        readonly: false,
      },
    }
  },
  methods: {
    // 获取权限
    getP(name, pName) {
      if (this._.hasOwn(this.p, name)) {
        if (pName === 'readonly') return !this.p[name][pName]
        return pName ? this.p[name][pName] : this.p[name]
      }
    },
    // 获取权限
    P(name) {
      const permission = getValueByPath(this.p, name)
      // console.log(name, permission)
      return permission
    },
    // 获取权限 readonly
    R(name) {
      if (!name) return this.p.readonly
      const permission = getValueByPath(this.p, `${name}.readonly`)
      // console.log(name, permission)
      return permission
    },
    // 获取权限 visible
    V(name) {
      if (!name) return this.p.visible
      const permission = getValueByPath(this.p, `${name}.visible`)
      // console.log(name, permission)
      return permission
    },
    // 获取权限 candel
    D(name) {
      if (!name) return this.p.candel
      const permission = getValueByPath(this.p, `${name}.candel`)
      // console.log(name, permission)
      return permission
    },
    // 获取权限 edit
    E(name) {
      if (!name) return this.p.edit
      const permission = getValueByPath(this.p, `${name}.edit`)
      // console.log(name, permission)
      return permission
    },
    // 处理主表权限
    handlePermission(payload) {
      if (!payload) return false
      const dd = this._.clone(payload)
      // this.p.readonly = !!toNumber(dd.readonly)
      let p = {}

      const childDd = this._.clone(dd.purview)
      if (!childDd) return false
      Object.assign(childDd, this._.array2object(childDd.cols))
      delete childDd.cols
      if (this._.hasOwn(childDd, 'element')) childDd.element = this._.array2object(childDd.element)
      this.walkPermission(childDd, this._.toNumber(childDd.readonly))
      p = childDd
      Object.assign(this.p, p)
    },
    // 处理子表权限
    handleChildPermission(key, payload) {
      const childDd = this._.clone(payload)
      Object.assign(childDd, this._.array2object(childDd.cols))
      delete childDd.cols
      childDd.readonly = !!this._.toNumber(childDd.readonly)
      this.walkPermission(childDd, childDd.readonly)
      this.p[key] = childDd
    },
    walkPermission(child, readonly) {
      for (const key in child) {
        const item = child[key]
        if (this._.isObject(item)) {
          this.walkPermission(item)
        } else if (!this._.isArray(item)) {
          child[key] = !!this._.toNumber(item)
          // 如果上层为readonly 各个子集也都为readonly
          if (readonly && key === 'readonly') child[key] = true
          child.edit = !child.readonly
        } else if (this._.isArray(item)) {
          this.walkPermission(this._.array2object(item))
        }
      }
    },
  },
}