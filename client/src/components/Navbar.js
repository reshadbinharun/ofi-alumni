import React, { Component } from 'react'
import { Menu } from 'semantic-ui-react'
import { Link } from 'react-router-dom'
import  TimeZoneDropdown  from './TimeZoneDropdown'

/*
    props:
    - userDetails - profile object
    - role
    -timezoneActive (enables/disables timezone dropdown)
    - navItems: [
        {
            id: 'item1',
            name: 'Item 1',
            navLink: '/link1'
        },
        {
            id: 'item2',
            name: 'Item 2',
            navLink: '/link2'
        }
    ]
    - activeItem
*/
export default class Navbar extends Component {
    constructor(props) {
        super(props)
        this.renderMenuItems = this.renderMenuItems.bind(this);
        this.handleOffsetChange = this.handleOffsetChange.bind(this);
    }
    renderMenuItems(items, activeItem) {
        return items && items.map( item => {
            return (
                <Menu.Item 
                    key={item.id}
                    as={Link}
                    to={item.navLink}
                    name={item.name}
                    active={activeItem === item.id}
                >
                    {item.name}
                </Menu.Item>
            )
        })
    }

    handleOffsetChange() {
        window.location.reload()
    }

    render() {
        const { navItems, activeItem, role } = this.props
        return (
            <Menu stackable>
                {this.renderMenuItems(navItems, activeItem)}
                
                {this.props.timezoneActive &&
                    <TimeZoneDropdown
                        userDetails={this.props.userDetails}
                        userRole={role}
                        liftTimezone={this.handleOffsetChange}
                    />
                }
            </Menu>
        )
    }
}