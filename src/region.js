export default {
  data() {
    return {
      searchForm: {
        provinceid: '',
        cityid: '',
        countyid: '',
      },
    }
  },
  computed: {
    isList() {
      return !this._.isObject(this.form)
    },
    pId() {
      if (this.isList) return this.searchForm.provinceid
      return this.form.ProvinceId
    },
    cId() {
      if (this.isList) return this.searchForm.cityid
      return this.form.CityId
    },
    provinceList() {
      // 排除全国
      if (!this.dictionaries.province) return []
      return this.dictionaries.province.filter(item => item.value !== 2016327148)
    },
    cityList() {
      if (this.pId) {
        return this.dictionaries.city[this.pId]
      }
      return [{
        disabled: false,
        label: '请选择省',
        value: '',
      }]
    },
    countyList() {
      if (this.cId) return this.dictionaries.county[this.cId]
      return [{
        disabled: false,
        label: '请选择市',
        value: '',
      }]
    },
  },
}