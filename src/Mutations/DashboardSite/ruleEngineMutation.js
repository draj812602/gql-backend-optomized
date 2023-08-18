/* eslint-disable array-callback-return */
/* eslint-disable camelcase */
const { get_user_id } = require('../../utils/getUserId')
const { AuthenticationError } = require('apollo-server-express')

// ! Create rules for perticular component of the device object
const createRulesPerDevComp = async (_, args, { request, pool }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { mac_address, component_id, rule_name, conditions } = args.data
      console.log('conditions=', conditions)
      const ruleConditionObj = {
        ruleData: {},
        conditions: []
      }
      let rule_obj = {
        rule_id: null,
        rule_name: null
      }
      const conditionObjects = []
      let conditionObj = {
        condition_id: null,
        condition_name: null,
        other_name: null,
        color: null,
        Minimum_Condition: null,
        Maximum_Condition: null,
        condition: null,
        value: null
      }
      //  get the device id from mac_address
      let device_id = null
      let parentId = null
      const isUserDevice = {
        text: 'select user_id, user_dev_id from tbl_user_device_info where user_id =$1 and mac_address=$2',
        values: [user_id, mac_address]
      }
      const userDeviceRes = await pool.query(isUserDevice)
      //  User Device available or not
      if (userDeviceRes.rows.length > 0) {
        userDeviceRes.rows.map(data => {
          device_id = data.user_dev_id
        })
      }

      //  is device id and compnent id exits with current user
      const qstr2 = {
        text: 'select * from tbl_rule_engine where user_id=$1 and device_id=$2 and component_id=$3',
        values: [user_id, device_id, component_id]
      }
      const isDeviceCompExistRes = await pool.query(qstr2)

      if (isDeviceCompExistRes.rows.length > 0) {
        isDeviceCompExistRes.rows.map(data => {
          parentId = data.id
        })

        //  is the rule_name exists on parentId ?
        const qstr3 = {
          text: 'select * from tbl_rule_engine_rules where dev_rule_id=$1 and rule_name=$2',
          values: [parentId, rule_name]
        }
        const isRuleNameExistRes = await pool.query(qstr3)
        if (isRuleNameExistRes.rows.length > 0) {
          throw new Error(`The rule name ${rule_name} is already exists`)
        } else {
          // create a rule object
          // childRuleId--> main rule Id from tbl_rule_engine_rules
          let childRuleId = null
          const createRule = {
            text: 'insert into tbl_rule_engine_rules(dev_rule_id,rule_name) values($1,$2) returning*',
            values: [parentId, rule_name]
          }
          const createRuleRes = await pool.query(createRule)
          createRuleRes.rows.map(data => {
            rule_obj = {
              rule_id: data.id,
              rule_name: data.rule_name
            }
            childRuleId = data.id
          })
          // add rule data
          ruleConditionObj.ruleData = rule_obj

          // conditions
          for (const cond of conditions) {
            console.log('cond=', cond)
            const { condition_name, other_name, color, Minimum_Condition, Maximum_Condition, condition, value } = cond
            let condition_flag = 1
            console.log(Minimum_Condition, Maximum_Condition)

            if (Minimum_Condition === undefined || Maximum_Condition === undefined) {
              condition_flag = 0
              console.log('inside undefined')
            } else if (Minimum_Condition === null || Maximum_Condition === null) {
              condition_flag = 0
              console.log('inside null')
            }
            console.log('condition_flag', condition_flag)
            let conditionId = null
            //  is condition is taken from name or other_name
            if (condition_name !== null && condition_name !== 'Other') {
              const createCondQuery = {
                text: 'insert into tbl_rule_engine_conditions(rule_id,name,color,condition_flag) values($1,$2,$3,$4) returning*',
                values: [childRuleId, condition_name, color, condition_flag]
              }
              // const condId = (await pool.query(createCondQuery)).rows[0].id
              const condRes = await pool.query(createCondQuery)

              condRes.rows.map(condData => {
                conditionId = condData.id
                conditionObj = {
                  condition_id: condData.id,
                  condition_name: condData.name,
                  color: condData.color,
                  other_name: null
                }
              })
            } else {
              const createCondQuery = {
                text: 'insert into tbl_rule_engine_conditions(rule_id,name,other_name,color,condition_flag) values($1,$2,$3,$4,$5) returning*',
                values: [childRuleId, condition_name, other_name, color, condition_flag]
              }
              // const condId = (await pool.query(createCondQuery)).rows[0].id
              // conditionId = condId
              const condRes = await pool.query(createCondQuery)

              condRes.rows.map(condData => {
                conditionId = condData.id
                conditionObj = {
                  condition_id: condData.id,
                  condition_name: condData.name,
                  other_name: condData.other_name,
                  color: condData.color
                }
              })
            }
            //  Minimum and Maximum value is available or not
            if (Minimum_Condition === undefined || Maximum_Condition === undefined) {
              const conditionValueQuery = {
                text: 'insert into tbl_rule_engine_value(condition_id,condition,value) values($1,$2,$3) returning*',
                values: [conditionId, condition, value]
              }
              const conditionValueRes = await pool.query(conditionValueQuery)
              conditionValueRes.rows.map(data => {
                conditionObj.condition = data.condition
                conditionObj.value = data.value
              })
            } else {
              const conditionRangeQuery = {
                text: 'insert into tbl_rule_engine_range(condition_id,min,max) values($1,$2,$3) returning*',
                values: [conditionId, Minimum_Condition, Maximum_Condition]
              }
              const conditionRangeRes = await pool.query(conditionRangeQuery)
              conditionRangeRes.rows.map(rangeData => {
                conditionObj.Maximum_Condition = rangeData.max
                conditionObj.Minimum_Condition = rangeData.min
              })
            }
            // ruleConditionObj.conditions.push(conditionObj)
            conditionObjects.push(conditionObj)
          }
          ruleConditionObj.conditions = conditionObjects
          // return true
          return ruleConditionObj
        }
      } else { //  if the device id and componentId does not exist in tbl_rule_engine parent table
        let ParentId = null
        // main rule id --> ChildRuleId
        let childRuleId = null
        const createParentRule = {
          text: 'insert into tbl_rule_engine(user_id,device_id,component_id) values($1,$2,$3) returning*',
          values: [user_id, device_id, component_id]
        }
        const createParentRuleRes = await pool.query(createParentRule)
        createParentRuleRes.rows.map(data => {
          ParentId = data.id
        })

        const createRuleQuery = {
          text: 'insert into tbl_rule_engine_rules(dev_rule_id,rule_name) values($1,$2) returning*',
          values: [ParentId, rule_name]
        }
        const newruleIdRes = await pool.query(createRuleQuery)
        newruleIdRes.rows.map(data => {
          rule_obj = {
            rule_id: data.id,
            rule_name: data.rule_name
          }
          childRuleId = data.id
        })
        // add rule data
        ruleConditionObj.ruleData = rule_obj

        // conditions
        for (const cond of conditions) {
          const { condition_name, other_name, color, Minimum_Condition, Maximum_Condition, condition, value } = cond
          let condition_flag = 1
          console.log(Minimum_Condition, Maximum_Condition)

          if (Minimum_Condition === undefined || Maximum_Condition === undefined) {
            condition_flag = 0
            console.log('inside undefined')
          } else if (Minimum_Condition === null || Maximum_Condition === null) {
            condition_flag = 0
            console.log('inside null')
          }
          let conditionId = null
          //  is condition is taken from name or other_name
          if (condition_name !== null && condition_name !== 'Other') {
            const createCondQuery = {
              text: 'insert into tbl_rule_engine_conditions(rule_id,name,color,condition_flag) values($1,$2,$3,$4) returning*',
              values: [childRuleId, condition_name, color, condition_flag]
            }
            // const condId = (await pool.query(createCondQuery)).rows[0].id
            const condRes = await pool.query(createCondQuery)

            condRes.rows.map(condData => {
              conditionId = condData.id
              conditionObj = {
                condition_id: condData.id,
                condition_name: condData.name,
                color: condData.color,
                other_name: null
              }
            })
          } else {
            const createCondQuery = {
              text: 'insert into tbl_rule_engine_conditions(rule_id,name,other_name,color,condition_flag) values($1,$2,$3,$4,$5) returning*',
              values: [childRuleId, condition_name, other_name, color, condition_flag]
            }

            const condRes = await pool.query(createCondQuery)
            condRes.rows.map(condData => {
              conditionId = condData.id
              conditionObj = {
                condition_id: condData.id,
                condition_name: condData.name,
                other_name: condData.other_name,
                color: condData.color
              }
            })
          }
          //  Minimum and Maximum value is available or not
          if (Minimum_Condition === undefined || Maximum_Condition === undefined) {
            const conditionValueQuery = {
              text: 'insert into tbl_rule_engine_value(condition_id,condition,value) values($1,$2,$3) returning*',
              values: [conditionId, condition, value]
            }
            const conditionValueRes = await pool.query(conditionValueQuery)
            conditionValueRes.rows.map(data => {
              conditionObj.condition = data.condition
              conditionObj.value = data.value
            })
          } else {
            const conditionRangeQuery = {
              text: 'insert into tbl_rule_engine_range(condition_id,min,max) values($1,$2,$3) returning*',
              values: [conditionId, Minimum_Condition, Maximum_Condition]
            }
            const conditionRangeRes = await pool.query(conditionRangeQuery)
            conditionRangeRes.rows.map(rangeData => {
              conditionObj.Maximum_Condition = rangeData.max
              conditionObj.Minimum_Condition = rangeData.min
            })
          }
          // ruleConditionObj.conditions.push(conditionObj)
          conditionObjects.push(conditionObj)
        }
        ruleConditionObj.conditions = conditionObjects
        // return true
        return ruleConditionObj
      }
    }
  } catch (error) {
    return error
  }
}

// ! Delete the user Device component Rule and its conditions permanently
const deleteDeviceCompRule = async (_, args, { request, pool }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { mac_address, component_id, rule_id } = args
      //  get the device id from mac_address
      let device_id = null
      let parentId = null // tbl_rule_engine -->id
      const isUserDevice = {
        text: 'select user_id, user_dev_id from tbl_user_device_info where user_id =$1 and mac_address=$2',
        values: [user_id, mac_address]
      }
      const userDeviceRes = await pool.query(isUserDevice)
      //  User Device available or not
      if (userDeviceRes.rows.length > 0) {
        userDeviceRes.rows.map(data => {
          device_id = data.user_dev_id
        })
      }
      // get the parent table id
      const qstr1 = {
        text: 'select * from tbl_rule_engine where device_id=$1 and component_id=$2 and user_id=$3',
        values: [device_id, component_id, user_id]
      }
      const getParentId = await pool.query(qstr1)

      if (getParentId.rows.length > 0) {
        getParentId.rows.map(data => {
          parentId = data.id
        })
      } else {
        throw new Error('device or component does not exist for current user')
      }
      //  rule id exist or not
      const qstr2 = {
        text: 'select * from tbl_rule_engine_rules where id=$1 and dev_rule_id=$2',
        values: [rule_id, parentId]
      }
      const getRuleId = await pool.query(qstr2)
      if (getRuleId.rows.length > 0) {
        // delete the rule from the database (tbl_rule_engine_rules)
        const qstr3 = {
          text: 'delete from tbl_rule_engine_rules where id=$1 returning*',
          values: [rule_id]
        }
        const deleteRule = await pool.query(qstr3)
        if (deleteRule.rows.length > 0) {
          //* **  If component rule is deleted then make chart(widget) rule id as null
          const qstr4 = {
            text: 'select widget_id from tbl_dashboard_widget where rule_id=$1',
            values: [rule_id]
          }
          const checkruleinwidget = await pool.query(qstr4)

          if (checkruleinwidget.rows.length > 0) {
            for (const widget of checkruleinwidget.rows) {
              const qstr5 = {
                text: 'update tbl_dashboard_widget set rule_id=$1 where widget_id=$2',
                values: [null, widget.widget_id]
              }
              await pool.query(qstr5)
            }
          }
          //*
          return 'Rule deleted successfully'
        }
      } else {
        throw new Error('Rule does not exist for current user')
      }
    }
  } catch (error) {
    return error
  }
}

// !  Delete condition from specific rule
const deleteCompRuleCondition = async (_, args, { request, pool }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { mac_address, component_id, rule_id, condition_id } = args

      //  get the device id from mac_address
      let device_id = null
      let parentId = null // tbl_rule_engine -->id
      const isUserDevice = {
        text: 'select user_id, user_dev_id from tbl_user_device_info where user_id =$1 and mac_address=$2',
        values: [user_id, mac_address]
      }
      const userDeviceRes = await pool.query(isUserDevice)
      //  User Device available or not
      if (userDeviceRes.rows.length > 0) {
        userDeviceRes.rows.map(data => {
          device_id = data.user_dev_id
        })
      }

      // get the parent table id
      const qstr2 = {
        text: 'select * from tbl_rule_engine where device_id=$1 and component_id=$2 and user_id=$3',
        values: [device_id, component_id, user_id]
      }
      const getParentId = await pool.query(qstr2)

      if (getParentId.rows.length > 0) {
        getParentId.rows.map(data => {
          parentId = data.id
        })
      } else {
        throw new Error('device or component does not exist for current user')
      }

      //  rule id exist or not
      const qstr1 = {
        text: 'select * from tbl_rule_engine_rules where id=$1 and dev_rule_id=$2',
        values: [rule_id, parentId]
      }
      const getRuleId = await pool.query(qstr1)
      if (getRuleId.rows.length > 0) {
        // check the conditions exists based on rule_id
        const qstr2 = {
          text: 'select * from tbl_rule_engine_conditions where rule_id=$1',
          values: [rule_id]
        }
        const isConditionsAvailable = await pool.query(qstr2)
        if (isConditionsAvailable.rows.length === 0) {
          // await pool.query(`delete from tbl_rule_engine_rules where id=${rule_id}`)
          throw new Error('There is no conditions')
        }
        // check the data available or not based on condition_id and rule_id
        const qstr3 = {
          text: 'select * from tbl_rule_engine_conditions where id=$1 and rule_id=$2',
          values: [condition_id, rule_id]
        }
        const isConditionExist = await pool.query(qstr3)
        if (isConditionExist.rows.length > 0) {
          const qstr4 = {
            text: 'delete from tbl_rule_engine_conditions where id=$1 and rule_id=$2 returning*',
            values: [condition_id, rule_id]
          }
          const deleteCondition = await pool.query(qstr4)
          if (deleteCondition.rows.length > 0) {
            return 'Condition deleted successfully'
          }
        } else {
          throw new Error('Condition does not exist for current user')
        }
      } else {
        throw new Error('Rule does not exist for current user')
      }
    }
  } catch (error) {
    return error
  }
}

// ! Update the rule conditions
const updateRuleConditions = async (_, args, { request, pool }) => {
  try {
    const token = request.headers.authorization
    const user_id = (await get_user_id(token, pool)).user_id
    if (user_id == null) {
      throw new AuthenticationError('Unautherized User')
    } else {
      const { mac_address, rule_id, rule_name, component_id, conditions } = args.input
      let device_id = null

      const ruleConditions = {
        rule_data: {},
        conditions: []
      }
      const ruleData = {
        mac_address: mac_address,
        devic_id: device_id,
        rule_id: null,
        rule_name: null,
        component_id: component_id
      }
      const conditionsObjArray = []
      let conditionObj = {
        condition_id: null,
        condition_name: null,
        other_name: null,
        color: null,
        Minimum_Condition: null,
        Maximum_Condition: null,
        condition: null,
        value: null
      }
      //  Is mac address is exist for current user
      const qstr1 = {
        text: 'select * from tbl_user_device_info where mac_address =$1 and user_id=$2',
        values: [mac_address, user_id]
      }
      const isMacAddressExist = await pool.query(qstr1)
      if (isMacAddressExist.rows.length > 0) {
        isMacAddressExist.rows.map(data => {
          device_id = data.user_dev_id
        })
      } else {
        throw new Error('Invalid device info')
      }
      ruleData.device_id = device_id
      //  is deviceid and component id exist for this user ?
      const qstr2 = {
        text: 'select * from tbl_rule_engine where user_id=$1 and device_id=$2 and component_id=$3',
        values: [user_id, device_id, component_id]
      }
      const isDevCompExists = await pool.query(qstr2)

      if (isDevCompExists.rows.length > 0) {
        const qstr3 = {
          text: 'select * from tbl_rule_engine_rules where id=$1',
          values: [rule_id]
        }
        const isRuleExist = await pool.query(qstr3)
        if (isRuleExist.rows.length > 0) {
          //  Updating rule data
          const updateRule = {
            text: 'update tbl_rule_engine_rules set rule_name=$1 where id=$2 returning*',
            values: [rule_name, rule_id]
          }
          const updateRuleRes = await pool.query(updateRule)
          updateRuleRes.rows.map(data => {
            ruleData.rule_id = data.id
            ruleData.rule_name = data.rule_name
          })
          ruleConditions.rule_data = ruleData
          let conditionId = null
          for (const cond of conditions) {
            const {
              condition_id, condition_name, other_name, color, Minimum_Condition, Maximum_Condition,
              condition,
              value
            } = cond

            // if the condition id exist with rule_id
            const qstr4 = {
              text: 'select * from tbl_rule_engine_conditions where id=$1 and rule_id=$2',
              values: [condition_id, rule_id]
            }
            const isConditionIdRuleIdExist = await pool.query(qstr4)
            if (isConditionIdRuleIdExist.rows.length === 0) {
              throw new Error('Condition does not exist')
            }
            // if name is not equal to "Other"
            if (condition_name !== null && condition_name !== 'Other') {
              const updateCondition = {
                text: 'update tbl_rule_engine_conditions set name=$1,color=$2 where id=$3 and rule_id=$4 returning*',
                values: [condition_name, color, condition_id, rule_id]
              }
              const updateConditionRes = await pool.query(updateCondition)
              //  condition data object
              updateConditionRes.rows.map(data => {
                conditionObj = {
                  condition_id: data.id,
                  condition_name: data.name,
                  other_name: data.other_name,
                  color: data.color
                }
                conditionId = data.id
              })
            } else { // if name is equal to "Other"
              const updateCondition = {
                text: 'update tbl_rule_engine_conditions set name=$1, other_name=$2,color=$3 where id=$4 and rule_id=$5 returning*',
                values: [condition_name, other_name, color, condition_id, rule_id]
              }
              const updateConditionRes = await pool.query(updateCondition)
              updateConditionRes.rows.map(data => {
                conditionObj = {
                  condition_id: data.id,
                  condition_name: data.name,
                  other_name: data.other_name,
                  color: data.color
                }
                conditionId = data.id
              })
            }
            //  is minmum and maximum values are available
            if (Minimum_Condition === undefined || Maximum_Condition === undefined) {
              const updateConditionValue = {
                text: 'update tbl_rule_engine_value set condition=$1,value=$2 where condition_id=$3 returning*',
                values: [condition, value, conditionId]
              }
              const updateConditionValueRes = await pool.query(updateConditionValue)
              updateConditionValueRes.rows.map(data => {
                conditionObj.condition = data.condition
                conditionObj.value = data.value
              })
            } else { //  if condition and value are available
              const updateConditionRange = {
                text: 'update tbl_rule_engine_range set min=$1,max=$2 where condition_id=$3 returning*',
                values: [Minimum_Condition, Maximum_Condition, conditionId]
              }
              const conditionRangeRes = await pool.query(updateConditionRange)
              conditionRangeRes.rows.map(rangeData => {
                conditionObj.Maximum_Condition = rangeData.max
                conditionObj.Minimum_Condition = rangeData.min
              })
            }
            conditionsObjArray.push(conditionObj)
          }
          ruleConditions.conditions = conditionsObjArray
          return ruleConditions
        } else {
          throw new Error('Rule does not exist')
        }
      } else {
        throw new Error('Invalid device component')
      }
    }
  } catch (error) {
    return error
  }
}

module.exports = {
  createRulesPerDevComp,
  deleteDeviceCompRule,
  deleteCompRuleCondition,
  updateRuleConditions
}
