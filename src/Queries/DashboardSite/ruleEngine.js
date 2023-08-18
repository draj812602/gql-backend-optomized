/* eslint-disable array-callback-return */
/* eslint-disable camelcase */
const { get_user_id } = require('../../utils/getUserId')
const { AuthenticationError } = require('apollo-server-express')

// ! Get specific device components and their rules by mac address and user_id
const getDevCompsRules = async (_, args, { pool, request }) => {
  try {
    const { mac_address } = args
    let device_id = null
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const device_info_data = {
        device_info: {},
        device_components: []
      }
      let device_info = {
        device_id: null,
        mac_address: null,
        device_type: null,
        location: null
      }
      let dev_components = []
      let components = {
        component_id: null,
        component_name: null,
        Minimum_Value: null,
        Maximum_Value: null,
        rules: []
      }
      const getDeviceQuery = {
        text: 'select user_id,user_dev_id,mac_address,location from tbl_user_device_info where user_id=$1 and mac_address=$2',
        values: [user_id, mac_address]
      }
      const getDeviceRes = await pool.query(getDeviceQuery)
      getDeviceRes.rows.map(data => {
        device_info = {
          location: data.location,
          device_id: data.user_dev_id
        }
        device_id = data.user_dev_id
      })
      const qstr1 = {
        text: 'select grp_enroll_id from tbl_devices where mac_address=$1',
        values: [mac_address]
      }
      const getGrpEnrIdRes = (await pool.query(qstr1)).rows[0].grp_enroll_id
      const qstr2 = {
        text: 'select device_type from tbl_grp_enrollment_info where grp_enrollment_id=$1',
        values: [getGrpEnrIdRes]
      }
      const getDeviceTypeRes = (await pool.query(qstr2)).rows[0].device_type
      //  Device info
      device_info.device_type = getDeviceTypeRes
      device_info.mac_address = mac_address
      device_info_data.device_info = device_info
      const getComponentsQuery = {
        text: 'select user_dev_comp_id,component_name,min_value,max_value from tbl_user_device_components where user_dev_id=$1 and (data_type=$2 OR data_type=$3)',
        values: [device_id, 'Decimal', 'Float']
      }

      //  Per device components
      const getComponentsRes = await pool.query(getComponentsQuery)
      if (getComponentsRes.rows.length > 0) {
        getComponentsRes.rows.map(data => {
          components = {
            component_id: data.user_dev_comp_id,
            component_name: data.component_name,
            Minimum_Value: data.min_value,
            Maximum_Value: data.max_value,
            rules: []
          }
          dev_components.push(components)
        })
      } else {
        dev_components = []
      }

      // for each componet rules are available or not
      const dev_comps = []
      for (const comp of dev_components) {
        const rules = []
        let rule_per_componet = {
          rule_id: null,
          rule_name: null
        }
        const query = {
          text: 'select * from tbl_rule_engine where component_id=$1',
          values: [comp.component_id]
        }
        const res = await pool.query(query)
        let id = null
        if (res.rows.length > 0) {
          // let id = null
          res.rows.map(data => {
            id = data.id
          })
        }
        if (id !== null) {
          const getRulesQuery = {
            text: 'select id, dev_rule_id,rule_name from tbl_rule_engine_rules where dev_rule_id=$1',
            values: [id]
          }
          const getRulesRes = await pool.query(getRulesQuery)

          if (getRulesRes.rows.length > 0) {
            getRulesRes.rows.map(data => {
              rule_per_componet = {
                rule_id: data.id,
                rule_name: data.rule_name
              }
              rules.push(rule_per_componet)
            })
            // comp.rules = rules
            comp.rules = rules
            dev_comps.push(comp)
          } else {
            comp.rules = []
            dev_comps.push(comp)
          }
        } else {
          comp.rules = []
          dev_comps.push(comp)
        }
      }
      device_info_data.device_components = dev_comps
      return device_info_data
    }
  } catch (error) {
    return error
  }
}
// ! Get the conditions of a Rule by user id, device id, component id
const getRuleConditions = async (_, args, { request, pool }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { mac_address, component_id, rule_id } = args
      let device_id = null
      const qstr1 = {
        text: 'select user_dev_id from tbl_user_device_info where mac_address=$1 and user_id=$2',
        values: [mac_address, user_id]
      }
      const isMacAddExist = await pool.query(qstr1)
      if (isMacAddExist.rows.length > 0) {
        isMacAddExist.rows.map(data => {
          device_id = data.user_dev_id
        })
      } else {
        throw new Error('Invalid mac address')
      }

      const ruleDataObj = {
        mac_address: mac_address,
        devic_id: device_id,
        rule_id: rule_id,
        component_id: component_id,
        rule_name: null
      }
      const ruleData = {
        rule_data: {},
        conditions: []
      }
      const conditionsArray = []
      let condition = {
        id: null,
        rule_id: null,
        name: null,
        other_name: null,
        color: null
      }
      const conditionDataResArray = []
      let conditionDataRes = {
        condition_id: null,
        condition_name: null,
        other_name: null,
        color: null,
        Minimum_Condition: null,
        Maximum_Condition: null,
        condition: null,
        value: null
      }
      const getParentData = {
        text: 'select * from tbl_rule_engine where user_id=$1 and device_id=$2 and component_id=$3',
        values: [user_id, device_id, component_id]
      }
      const getParentDataRes = await pool.query(getParentData)
      if (getParentDataRes.rows.length > 0) {
        let parent_id = null
        getParentDataRes.rows.map(data => {
          parent_id = data.id
        })

        // check parent id and rule_id is available in rules table
        const qstr2 = {
          text: 'select * from tbl_rule_engine_rules where dev_rule_id=$1 and id=$2',
          values: [parent_id, rule_id]
        }
        const isParentIdExistInRules = await pool.query(qstr2)
        if (isParentIdExistInRules.rows.length === 0) {
          throw new Error('does not exist rule for current user')
        }
        const qstr3 = {
          text: 'select * from tbl_rule_engine_rules where id=$1',
          values: [rule_id]
        }
        const ruleIdDetails = await pool.query(qstr3)
        ruleIdDetails.rows.map(data => {
          ruleDataObj.rule_name = data.rule_name
        })
        //  Rule data like rule_name,rule_id,component_id,rule_id
        ruleData.rule_data = ruleDataObj
        const qstr4 = {
          text: 'select * from tbl_rule_engine_conditions where rule_id=$1',
          values: [rule_id]
        }
        const getConditions = await pool.query(qstr4)
        getConditions.rows.map(data => {
          condition = {
            id: data.id,
            rule_id: data.rule_id,
            name: data.name,
            other_name: data.other_name,
            color: data.color
          }
          conditionsArray.push(condition)
        })
        //  checking the conditions whether they have min max value(range) or condition and value
        for (const cond of conditionsArray) {
          const { id, name, other_name, color } = cond
          //  in case of range
          const qstr5 = {
            text: 'select * from tbl_rule_engine_range where condition_id=$1',
            values: [id]
          }
          const getConditionData = await pool.query(qstr5)
          if (getConditionData.rows.length > 0) {
            getConditionData.rows.map(data => {
              conditionDataRes = {
                condition_id: id,
                color: color,
                condition_name: name,
                other_name: other_name,
                Maximum_Condition: data.max,
                Minimum_Condition: data.min,
                condition: null,
                value: null
              }
              conditionDataResArray.push(conditionDataRes)
            })
          } else {
            //  incase of value
            const qstr6 = {
              text: 'select * from tbl_rule_engine_value where condition_id=$1',
              values: [id]
            }
            const getConditionData = await pool.query(qstr6)
            if (getConditionData.rows.length > 0) {
              getConditionData.rows.map(data => {
                conditionDataRes = {
                  condition_id: id,
                  color: color,
                  condition_name: name,
                  other_name: other_name,
                  Maximum_Condition: null,
                  Minimum_Condition: null,
                  condition: data.condition,
                  value: data.value
                }
                conditionDataResArray.push(conditionDataRes)
              })
            }
          }
        }
        ruleData.conditions = conditionDataResArray
        return ruleData
      } else {
        throw new Error('invalid device or component')
      }
    }
  } catch (error) {
    return error
  }
}

module.exports = { getDevCompsRules, getRuleConditions }
