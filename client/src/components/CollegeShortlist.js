import React, { Component } from 'react';
import { Menu, Label, Card, Button, Icon } from 'semantic-ui-react';
import CollegeShortlistModal from './CollegeShortlistModal';
import { makeCall } from "../apis";

const STUDENT = "STUDENT"

export default class CollegeShortlist extends Component {
    constructor(props) {
        super(props)
        this.state = {
            activeItem: "shortlist",
            collegeModalOpen: false,
            collegeShortlist: [],
            deleteCollege: false,
        }
        this.openCollegeModal = this.openCollegeModal.bind(this);
        this.closeCollegeModal = this.closeCollegeModal.bind(this);
        this.addToShortlist = this.addToShortlist.bind(this);
    }

    openCollegeModal() {
        this.setState({
            collegeModalOpen: true
        })
    }
    closeCollegeModal() {
        this.setState({
            collegeModalOpen: false
        }, () => {
            this.props.refreshProfile(STUDENT, this.props.details._id)
        })
    }

    async removeCollege(e, collegeId) {
        e.preventDefault()
        this.setState({deleteCollege: true},
            async () => {
                await makeCall({collegeId: collegeId}, `/student/collegeShortlist/remove/${this.props.details._id}`, 'patch')
                this.setState({
                    deleteCollege: false
                }, () => 
                    this.props.refreshProfile(STUDENT, this.props.details._id)
                )
            })
    }

    addToShortlist(newCollege) {        
        let currentCollegeShortlist = this.props.details.collegeShortlist
        currentCollegeShortlist.push(newCollege) 
        this.setState({
            collegeShortlist: currentCollegeShortlist
        })
    }

    render() {
        const details = this.props.details;
        const isViewOnly = this.props.isViewOnly;
        return (
            <div>
            
            <Menu secondary stackable>
                <Menu.Item
                    id='shortlist'
                    name='College Shortlist'
                    active={this.state.activeItem === 'shortlist'}
                    onClick={this.handleMenuClick}
                >
                    College Shortlist
                    {   (this.state.shortlist !== []) && 
                         <Label color='teal'>{details.collegeShortlist.length}</Label>
                    }
                </Menu.Item>
                
            </Menu>
            {this.state.activeItem === 'shortlist' &&
                <div style={{paddingLeft: 13, paddingRight: 13}}>
                    <Card fluid>
                    <Card.Content>
                    <Card.Header>{`${details.name}'s College Picks`}</Card.Header>
                    { !details.collegeShortlist.length ?
                    <Card.Description> Add colleges to begin your college shortlist!</Card.Description> : 
                        <Card.Description>Colleges: {details.collegeShortlist.map(college => 
                        <Label
                                key={college._id}
                                style={{
                                    'margin': '3px'
                                }}
                                color='blue'
                            >
                                {college.name}
                                {
                                    !this.props.isViewOnly &&
                                    <Icon
                                        onClick={(e) => this.removeCollege(e, college._id)}
                                        name='delete'
                                    />
                                }
                            </Label>
                        ) } 
                        </Card.Description> }
                        <Card.Description>               
                        {
                            !isViewOnly ? 
                            <>
                                <Button
                                    style={{'margin': '0 0 2px 2px'}}
                                    icon
                                    color="blue"
                                    type="button"
                                    size="mini"
                                    onClick={this.openCollegeModal}
                                >   Add College  
                                    <Icon name='pencil' color="blue"/>
                                </Button>
                                <CollegeShortlistModal
                                    modalOpen={this.state.collegeModalOpen}
                                    id={details._id}
                                    addToShortlist={this.addToShortlist}
                                    collegeShortlist={details.collegeShortlist}
                                    closeModal={this.closeCollegeModal}
                                />
                            </> : null
                        }
                    </Card.Description> 
                    
                    </Card.Content>
                    </Card>
                </div>
            }
            </div>
            
        )
    }
}

