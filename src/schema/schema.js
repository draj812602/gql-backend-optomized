/* eslint-disable no-tabs */
/** @format */

const { gql } = require('apollo-server-express')

const typeDefs = gql`
# //! All queries
type Query{
		
		get_user_dahboard_data: [dashboard_data]
		get_device_dataset_name: [device_dataset]
		get_user_devices: [user_device_info]
		getInitialWidgetData(datasetName: String!, deviceId: String!,rule_id:Int,timeInterval:Int):[sensorData]
		# // ! Get pubsub auth token for subscription
		getPubsubToken:PubsubToken
		#!for new dashboard query approcah
		getUserDashboardNames:[user_dashboard_names]
		getUserDashboardWidgetInfo(dashboard_id:Int):[widgetData]

		# //! Rule engine for dashboard
		getDevCompsRules(mac_address:String):Device_Comp_rules
		getRuleConditions(mac_address:String,component_id:String,rule_id:String):Dev_rule_conditions
	}

#  // ! All Mutations
	type Mutation {
		
		register_user_device(input:user_device_data):deviceinfo
		add_user_info:Boolean
		save_user_dashboard(input:user_dashboard_data):dashboard_data
		save_dashboard_name(dashboard_name:String):dashboard
		delete_user_dashboard(dashboard_id:Int!):String
		delete_widget(dashboard_id:Int,widget_id:Int):String
		deleteWidgetComp(dashboard_id:Int,widget_id:Int,component_id:Int):String
		edit_dashboard_name(dashboard_id:Int!,new_name:String!):String
		update_user_components(input:controll_dev_comp):[sensorPowerData]
        edit_sensor_widget(input:edit_input_widget_info):editWidgetInfo
		# //! Rule engine for dashboard
		createRulesPerDevComp(data:Component_Rules):RuleConditions
		deleteDeviceCompRule(mac_address:String,component_id:String,rule_id:String):String
		# deleteDeviceCompRule(rule_id:String):String
		deleteCompRuleCondition(mac_address:String, component_id:String,rule_id:String,condition_id:String):String
		# //! need to modify
		updateRuleConditions(input:Comp_Rule_Conditions):UpdatedRuleConditionsData
		getSensorDataOnTimeInterval(input:chartInfo):sensorValues

	}

# //! All Subscriptions

type Subscription{
		sensordata(topic:topic_name):[sensorValues]
		isDeviceActivated(topic:topic_name):IsDeviceActivated
		d2cMessage(topic:topic_name):d2cMessage
		streamData:StreamData
	}
	input  topic_name {
		topic:String!
	}
# //! Rule Engine get the Device component rules
	type Device_Comp_rules {		
		device_info:Device_info
		device_components: [Device_comps]        
	}
	type Device_info {
		device_id: String,
		mac_address: String,
		device_type: String,
		location: String,
	}

	type Device_comps{
		component_id: String,
		component_name: String,
		Minimum_Value: String,
		Maximum_Value: String,
		rules: [Comp_rules]        
	}
	
	type Comp_rules{
		rule_id: String,
        rule_name: String
	}

# //! Create component rules from
	input Component_Rules{
		mac_address:String,
		component_id:String,
		rule_name:String,
		conditions:[InputCondition]
	}
	
	input InputCondition{
		condition_name:String,
		other_name:String,
		color:String,
		Minimum_Condition:String,
		Maximum_Condition:String,
		condition:String,
		value:String
	}

	# //! Resulet from crate rules and condition Objects
	type RuleConditions{
		ruleData:RuleData,
		conditions:[ConditionData]
	}
	type RuleData{
		rule_id:String,
		rule_name:String
	}

	type ConditionData{
		condition_id: String,
		condition_name: String,
		other_name: String,
		color: String,
		Minimum_Condition: String,
		Maximum_Condition: String,
		condition: String,
		value: String
	}

# //! get device rules and conditions
	type Dev_rule_conditions{
		rule_data:Rule_data
		conditions:[ConditionData]
	}

	type Rule_data{
		mac_address:String,
		devic_id: String,
		rule_id: String,
		rule_name: String,
		component_id: String,
	}

# //! update rule and its conditions
	input Comp_Rule_Conditions{
		mac_address: String,
		component_id: String, 
		rule_id:String,
		rule_name:String, 
		conditions:[Update_condition_data]
	}
	input Update_condition_data {
		condition_id:String,
		condition_name:String, 
		other_name: String,
		color:String, 
		Minimum_Condition: String,
		Maximum_Condition: String,
		condition:String, 
		value:String,
	}
	# //!  updated rule and its conditions result
	type UpdatedRuleConditionsData{
		rule_data:Rule_data
		conditions:[ConditionData]
	}
##################################################################
	type dashboard_data{
		dashboard_id:Int
		dashboard_name:String
		widget_data:[widgetData]
	}

	  type widgetData {
		widget_id: Int
		widget_name: String
		widget_title: String
		sensorName: String
		device_name: String
		device_id:Int
		device_location:String
		component_id:Int
		rule_id:Int
		rule_name:String
		data_time_interval:String
		data:[sensorData]
		user_device_datasetname:[device_dataset]
		sensor_power_data:[sensorPowerData]
	}

	type device_dataset {
		device_name: String
		device_id:Int
		device_dataset: [datasets]
		dev_component_names:[component_name]
	}
	type datasets {
		component_id:Int
		dataset_name: String
		rules:[comp_rule]
	}
	type component_name{
		component_id:Int
		component_name:String    
		#is_checked:Boolean                                                                                                                                                                                                                           
   }
   type comp_rule{
	   rule_id:Int
	   rule_name:String
   }
   
   type sensorPowerData{
	dashboard_id:Int
	widget_id:Int
	data_type:String
	component_id:Int
	component_name:String
	init_value:String
	in_out:String
	updated_at:String
	response:String
	responseType:String
}

type user_device_info {
	mac_address: String
	location: String
	is_activated: Boolean
	device_type:String
}

type sensorData {
	# recordedPeriod:period
	sensorValue: Float
	sensorValueAddedTime: String
	color_code:String
	condition:String
}
type period{
	start_date:String
	end_date:String
	start_time:String
	end_time:String
}
# //! For pubsub Auth token generation
	type PubsubToken{
		token:String
	}

	type user_dashboard_names{
		dashboard_id:Int
		dashboard_name:String
	}


	input user_device_data {
		mac_address: String
		deviceLocation: String
		country:Country!
	}
	input Country{
		label:String!
		value:String!
	}
	type deviceinfo{
		mac_address:String,
		location:String,
		is_activated:Boolean
		country:String,
		country_code: String,
   }

	input user_dashboard_data {
		dashboard_id: Int
		widget_name: String
		widget_title: String
		device_id:Int
		component_id:Int
		rule_id:Int
		#widget_id: Int
		#isChecked:Boolean
		#device_dataset: String
		#device_components:[sp_components]
	}

	input sp_components{
		component_id:Int
		component_name:String
		isChecked:Boolean
	}
	type dashboard{
		dashboard_id:Int,
		dashboard_name:String
	}

	input controll_dev_comp{
	    dashboard_id:Int
		widget_id:Int
		device_id:Int
		comp_id:Int
		data_type:String
		init_value:String
	}
input edit_input_widget_info{
	dashboard_id:Int
	widget_id:Int
	widget_title:String
	device_id:Int
	component_id:Int
	rule_id:Int
	device_name:String
	timeInterval:String
}
type editWidgetInfo{
	dashboard_id:Int
	widget_id:Int
	widget_title:String
	device_id:Int
	component_id:Int
	rule_id:Int
	rule_name:String
	timeInterval:String
	data:[sensorData]
}

input chartInfo{
	widget_id:Int
	mac_address:String
	component_id:Int
	datasetName:String
	rule_id:Int
	timeInterval:String
	
}
######## SUBSCRIPTION #############
    
	type sensorValues{
		widget_id:Int
		device_id:String
		sensorName:String
		component_id:Int
		rule_id:Int
		data_time_interval:String
		data:[sensorData]
	}
	
	# // ! Is Device activated or not
	type IsDeviceActivated{
		device_id: String
		device_name: String
		location:String
		is_activated:Boolean
	}

	type d2cMessage{
	   data_type:String
	   component_id:Int
	   component_name:String
	   init_value:String
	   in_out:String
	   updated_at:String
	}

	# //! Stream analytics
	type StreamData{
		messageId: String
		deviceId: String,
		temperature: String,
		humidity: String,
		color:String
	}

###### END SUBSCRIPTION #######

`

module.exports = typeDefs
