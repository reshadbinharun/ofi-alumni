import React, { Component } from 'react';
import {Button, Modal, Segment, Header, Dropdown, Label, Icon} from 'semantic-ui-react';
import swal from "sweetalert";
import { makeCall } from "../apis";

const dayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    .map(day => {
        return {
            key: day.toLowerCase(),
            text: day,
            value: day
        }
    })
export const timeSlotOptions = [
    {
        key: 'slot1',
        value: 0,
        text: '12am - 1am'
    },
    {
        key: 'slot2',
        value: 100,
        text: '1am - 2am'
    },
    {
        key: 'slot3',
        value: 200,
        text: '2am - 3am'
    },
    {
        key: 'slot4',
        value: 300,
        text: '3am - 4am'
    },
    {
        key: 'slot5',
        value: 400,
        text: '4am - 5am'
    },
    {
        key: 'slot6',
        value: 500,
        text: '5am - 6am'
    },
    {
        key: 'slot7',
        value: 600,
        text: '6am - 7am'
    },
    {
        key: 'slot8',
        value: 700,
        text: '7am - 8am'
    },
    {
        key: 'slot9',
        value: 800,
        text: '8am - 9am'
    },
    {
        key: 'slot10',
        value: 900,
        text: '9am - 10am'
    },
    {
        key: 'slot11',
        value: 1000,
        text: '10am - 11am'
    },
    {
        key: 'slot12',
        value: 1100,
        text: '11am - 12pm'
    },
    {
        key: 'slot13',
        value: 1200,
        text: '12pm - 1pm'
    },
    {
        key: 'slot14',
        value: 1300,
        text: '1pm - 2pm'
    },
    {
        key: 'slot15',
        value: 1400,
        text: '2pm - 3pm'
    },
    {
        key: 'slot16',
        value: 1500,
        text: '3pm - 4pm'
    },
    {
        key: 'slot17',
        value: 1600,
        text: '4pm - 5pm'
    },
    {
        key: 'slot18',
        value: 1700,
        text: '5pm - 6pm'
    },
    {
        key: 'slot19',
        value: 1800,
        text: '6pm - 7pm'
    },
    {
        key: 'slot20',
        value: 1900,
        text: '7pm - 8pm'
    },
    {
        key: 'slot21',
        value: 2000,
        text: '8pm - 9pm'
    },
    {
        key: 'slot22',
        value: 2100,
        text: '9pm - 10pm'
    },
    {
        key: 'slot23',
        value: 2200,
        text: '10pm - 11pm'
    },
    {
        key: 'slot24',
        value: 2300,
        text: '11pm - 12am'
    },
]

/*
props:
    - modalOpen: boolean
    - closeModal: ()
    - timePreferences: [
        {
            id: 'Sunday-400',
            day: 'Sunday',
            time: 400,
            text: `Sunday (4am - 5am)`
        }
        ...
    ]
    - id
*/
export default class TimePreferencesModal extends Component {
    constructor(props){
        super(props)
        this.state = {
            day: '',
            selectedTimes: this.props.timePreferences || [],
            uncommittedTimesForCurrentDay: [],
            submitting: false
        }
        this.handleDayChange = this.handleDayChange.bind(this)
        this.getSelectedTimes = this.getSelectedTimes.bind(this)
        this.removeSelectedTime = this.removeSelectedTime.bind(this)
        this.handleTimeSlotChange = this.handleTimeSlotChange.bind(this)
        this.commitAvailability = this.commitAvailability.bind(this)
        this.submitPreferences = this.submitPreferences.bind(this)
        this.hasNewPreferences = this.hasNewPreferences.bind(this)
    }

    hasNewPreferences() {
        let oldTimeIds = this.props.timePreferences && this.props.timePreferences.map(time => time.id)
        let newTimeIds = this.state.selectedTimes.map(time => time.id)
        if (newTimeIds.length !== oldTimeIds.length) {
            return true
        }
        return newTimeIds.filter(time => !oldTimeIds.includes(time)).length
    }

    submitPreferences(e) {
        e.preventDefault()
        this.setState({
            submitting: true
        }, async () => {
            let payload = {
                timePreferences: this.state.selectedTimes
            }
            try {
                const result = await makeCall(payload, `/alumni/timePreferences/${this.props.id}`, 'patch')
                if (!result || result.error) {
                    this.setState({
                        submitting: false
                    }, () => {
                        swal({
                            title: "Error!",
                            text: "There was an error updating your time preferences, please try again.",
                            icon: "error",
                        });
                    })
                } else {
                    this.setState({
                        submitting: false
                    }, () => {
                        swal({
                            title: "Done!",
                            text: "Your time preferences were successfully updated!",
                            icon: "success",
                        }).then(() => {
                            this.props.closeModal();
                        })
                    })
                    
                }
            } catch (e) {
                this.setState({
                    submitting: false
                }, () => {
                    console.log("Error: TimePreferencesModal#submitPreferences", e);
                })
            }
        })
    }

    handleDayChange(e, {value}) {
        e.preventDefault();
        this.setState({
            day: value
        })
    }

    removeSelectedTime(e, timeId) {
        e.preventDefault()
        this.setState({
            selectedTimes: this.state.selectedTimes.filter(time => time.id !== timeId)
        })
    }

    commitAvailability(e) {
        e.preventDefault()
        // remove potentially duplicate availabilities
        let allExistingIds = this.state.selectedTimes.map(selectedtime => selectedtime.id)
        let dedupedUncommitedTimesForCurrentDay =
            this.state.uncommittedTimesForCurrentDay.filter(
                time => !allExistingIds.includes(`${this.state.day}-${time.toString()}`)
            )
        let newSelectedTimesToAdd = dedupedUncommitedTimesForCurrentDay.map( time => {
            return {
                id: `${this.state.day}-${time.toString()}`,
                day: this.state.day,
                time: time,
                text: `${this.state.day} (${timeSlotOptions.find( slot => slot.value === time).text})`
            }
        })
        let newSelectedTimes = [...this.state.selectedTimes, ...newSelectedTimesToAdd]
        this.setState({
            selectedTimes: newSelectedTimes,
            day: '',
            uncommittedTimesForCurrentDay: []
        })
    }

    handleTimeSlotChange(e, {value}) {
        e.preventDefault()
        this.setState({
            uncommittedTimesForCurrentDay: value
        })
    }

    getSelectedTimes() {
        return this.state.selectedTimes && this.state.selectedTimes.map(time => {
            return (
            <Label
                key={time.text}
                style={{'margin': '2px'}}
            >
                {time.text}
                <Icon
                    onClick={(e) => this.removeSelectedTime(e, time.id)}
                    name='delete'
                />
            </Label>
            )
        })
    }
    render() {
        return (
            <Modal
                open={this.props.modalOpen}
            >
                <Modal.Header>Select your time availabilities!</Modal.Header>
                <Modal.Content>
                    <Segment>
                        <Header>Pick a day and your availabilities</Header>
                        {
                            this.state.selectedTimes && this.state.selectedTimes.length ? 
                            <Segment>
                                {this.getSelectedTimes()}
                            </Segment>  :
                            null
                        }
                        
                        <Dropdown
                            style={{ 'margin': '5px'}}
                            placeholder='Day'
                            fluid
                            selection
                            options={dayOptions} 
                            onChange={this.handleDayChange}
                            value={this.state.day}
                            name='day'
                        />
                        {
                            this.state.day ? 
                            <Dropdown
                                style={{ 'margin': '5px'}}
                                placeholder='Time Slot'
                                fluid
                                multiple
                                selection
                                disabled={!this.state.day}
                                options={timeSlotOptions}
                                value={this.state.uncommittedTimesForCurrentDay}
                                onChange={this.handleTimeSlotChange}
                                name='timeSlots'
                            /> :
                            null
                        }
                        <Button
                            primary
                            onClick={this.commitAvailability}
                            disabled={!(this.state.day.length && this.state.uncommittedTimesForCurrentDay.length)}
                        >
                            Check in availabilities for day.
                        </Button>
                    </Segment>
                </Modal.Content>
                <Modal.Actions>
                    <Button
                        primary
                        disabled={!this.hasNewPreferences() || this.state.submitting}
                        onClick={this.submitPreferences}
                        loading={this.state.submitting}
                    >
                        Submit New Preferences
                    </Button>
                    <Button onClick={this.props.closeModal}>
                        Close
                    </Button>
                </Modal.Actions>
            </Modal>
        )
    }
}