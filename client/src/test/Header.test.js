import React from 'react';

import { render, screen } from '@testing-library/react'
import HeaderComponent from '../components/Header';
import { BrowserRouter as Router } from 'react-router-dom'


test('Footpoints shows up in header', () => {
    render(<Router><HeaderComponent footyPoints={10}
                                    loggedIn={true}
                                    school={ {logoURL: 'example.com/logo'} }/>
           </Router>);
    expect(screen.getByText('10')).toBeTruthy();
})