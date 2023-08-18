/* eslint-disable camelcase */
/** @format */

const { pubsub } = require('./dataPublisher')
const { isActivePubsub } = require('./deviceConnectivityStatus')
// ! AuthToken for graphql pubsub
const { getPubsubToken } = require('../Queries/pubsubToken')

// ! Adding the user info for devicesite and dashboard site
const { add_user_info } = require('../Mutations/addUser')

//! DASHBOARD SITE MUTATIONS
const {
  deleteWidgetComp,
  delete_user_dashboard,
  delete_widget,
  edit_dashboard_name,
  save_dashboard_name,
  save_user_dashboard,
  update_user_components,
  edit_sensor_widget,
  getSensorDataOnTimeInterval
} = require('../Mutations/DashboardSite/Dashboard')
const { register_user_device } = require('../Mutations/DashboardSite/userDevices')

const {
  createRulesPerDevComp,
  deleteDeviceCompRule,
  deleteCompRuleCondition,
  updateRuleConditions
} = require('../Mutations/DashboardSite/ruleEngineMutation')

//! DASHBOARD SITE QURIES
const { get_user_devices } = require('../Queries/DashboardSite/userDevices')
const {
  getInitialWidgetData,
  get_device_dataset_name,
  get_user_dahboard_data,
  getUserDashboardNames,
  getUserDashboardWidgetInfo
} = require('../Queries/DashboardSite/userDashboard')

const { getDevCompsRules, getRuleConditions } = require('../Queries/DashboardSite/ruleEngine')

const resolvers = {
  // ! 🔐🔐 All Queries 🔐🔐
  Query: {

    get_user_dahboard_data: (_, args, { pool, request }) => get_user_dahboard_data(_, args, { pool, request }),
    get_device_dataset_name: (_, args, { pool, request }) => get_device_dataset_name(_, args, { pool, request }),
    get_user_devices: (_, args, { pool, request }) => get_user_devices(_, args, { pool, request }),
    getInitialWidgetData: (_, args, { pool, request, pusher }) => getInitialWidgetData(_, args, { pool, request, pusher }),
    // Pubsub Auth token
    getPubsubToken: (_, args, { pool, request }) => getPubsubToken(_, args, { pool, request }),
    getUserDashboardNames: (_, args, { pool, request }) => getUserDashboardNames(_, args, { pool, request }),
    getUserDashboardWidgetInfo: (_, args, { pool, request }) => getUserDashboardWidgetInfo(_, args, { pool, request }),

    // ! Rule engine
    getDevCompsRules: (_, args, { pool, request }) => getDevCompsRules(_, args, { pool, request }),
    getRuleConditions: (_, args, { pool, request }) => getRuleConditions(_, args, { pool, request })
  },
  // ! 🔐🔐 All Mutations 🔐🔐
  Mutation: {
    register_user_device: (_, args, { pool, request }) => register_user_device(_, args, { pool, request }),
    add_user_info: (_, args, { pool, request }) => add_user_info(_, args, { pool, request }),
    save_user_dashboard: (_, args, { pool, request }) => save_user_dashboard(_, args, { pool, request }),
    delete_user_dashboard: (_, args, { pool, request }) => delete_user_dashboard(_, args, { pool, request }),
    delete_widget: (_, args, { pool, request }) => delete_widget(_, args, { pool, request }),
    edit_dashboard_name: (_, args, { pool, request }) => edit_dashboard_name(_, args, { pool, request }),
    save_dashboard_name: (_, args, { pool, request }) => save_dashboard_name(_, args, { pool, request }),
    update_user_components: (_, args, { pool, request }) => update_user_components(_, args, { pool, request }),
    deleteWidgetComp: (_, args, { pool, request }) => deleteWidgetComp(_, args, { pool, request }),
    edit_sensor_widget: (_, args, { pool, request }) => edit_sensor_widget(_, args, { pool, request }),
    // ! Rule Engine
    createRulesPerDevComp: (_, args, { pool, request }) => createRulesPerDevComp(_, args, { pool, request }),
    deleteDeviceCompRule: (_, args, { pool, request }) => deleteDeviceCompRule(_, args, { pool, request }),
    deleteCompRuleCondition: (_, args, { pool, request }) => deleteCompRuleCondition(_, args, { pool, request }),
    updateRuleConditions: (_, args, { pool, request }) => updateRuleConditions(_, args, { pool, request }),
    getSensorDataOnTimeInterval: (_, args, { pool, request }) => getSensorDataOnTimeInterval(_, args, { pool, request })

  },
  // ! 🔐🔐 All Subscriptions 🔐🔐
  Subscription: {
    // ! Under testing not yet confirm
    sensordata: {
      subscribe (_, args) {
        try {
          const { topic } = (args)
          console.log(topic.topic)
          return pubsub.asyncIterator(`"${topic.topic}"`)
          // return pubsub.asyncIterator()
        } catch (error) {
          return error
        }
      }
    },

    // ! is Device Active subscription -> Completed
    isDeviceActivated: {
      subscribe (_, args) {
        try {
          // console.log('sub is called')
          const { topic } = (args)
          return isActivePubsub.asyncIterator(`"${topic.topic}"`)
          // return isActivePubsub.asyncIterator('isDeviceActivated')
        } catch (error) {
          return error
        }
      }
    },
    d2cMessage: {
      subscribe (_, args) {
        try {
          const { topic } = (args)
          console.log(topic)
          return pubsub.asyncIterator(`"${topic.topic}"`)
          // return pubsub.asyncIterator()
        } catch (error) {
          return error
        }
      }
    }
  }
}

module.exports = resolvers
