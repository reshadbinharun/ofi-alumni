import React, { useState, useEffect } from 'react';
import { Card, Search, Pagination, Grid, Segment, Button, Dropdown, Checkbox, Label } from 'semantic-ui-react'
import { makeCall } from '../../apis';
import MergeModal from './MergeModal'
import NewInstitutionModal from './NewInstitutionModal'

export default function CollegesList(props) {
    const [allColleges, setAllColleges] = useState([])
    const [filteredColleges, setFilteredColleges] = useState([])
    const [display, setDisplay] = useState([])
    const [pages, setPages] = useState(0)
    const [currPage, setCurrPage] = useState(1)
    const [selectedIds, setSelectedIds] = useState({})
    const [mergeButtonActive, setMergeButtonActive] = useState(false)
    const [mergeButtonDisabled, setMergeButtonDisabled] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [secondaryFilter, setSecondaryFilter] = useState('')
    const [mergeModalOpen, setMergeModalOpen] = useState(false)
    const [newInstitutionModalOpen, setNewInstitutionModalOpen] = useState(false)

    const pageSize = 6;

    const locationOptions = () => {
        let options = [];
        for (let college of allColleges) {
            if(!options.find(location => location['value'] === college.country)) {
                options.push({
                    key: college.country,
                    text: college.country,
                    value: college.country
                });
            }
        }
        return options;
    }

    const filterOptions = [
        {
            key: 'All Fields',
            text: 'All Fields',
            value: 'all'
        },
        {
            key: 'Location',
            text: 'Location',
            value: 'Location:'
        }
    ]
    
    //Mounting
    useEffect(() => {
        if(!newInstitutionModalOpen) {
            makeCall({}, '/admin/allColleges/' + props.userDetails._id, 'get')
                .then((res) => {
                    setAllColleges(res.colleges)
                })
        }
    }, [props, newInstitutionModalOpen]);

    //Setting up display post API calls
    useEffect(() => {
        completeColleges()
    }, [allColleges]);

    //Page change
    useEffect(() => {
        setPages(Math.ceil(filteredColleges.length / pageSize));
        constructDisplay()
    }, [currPage, filteredColleges]);

    //Search
    useEffect(() => {
        if (filter === 'all') {
            setFilteredColleges(allColleges.filter((college) => {
                return college.allText.includes(search.toLowerCase());
            }));
            setSecondaryFilter('')
        } else if (filter === 'Location:') {
            setFilteredColleges(allColleges.filter((college) => {
                return (college.allText.includes(search.toLowerCase()) 
                    && college.country.includes(secondaryFilter));
            }));
        }
    }, [search, secondaryFilter, filteredColleges, filter])
    
    const completeColleges = () => {
        for (let college of allColleges) {
            college.allText = college.name + ' ' + college.location
        }
        let sortedColleges = allColleges.sort((a,b) => {
            if(a.country < b.country) { return -1; }
            if(a.country > b.country) { return 1; }
            return 0;
        })
        setFilteredColleges(sortedColleges)
    }

    const constructDisplay = () => {
        if (!filteredColleges || !filteredColleges.length) return;
        let cardArray = []
        for (let i = 0; i < pageSize; i++) {
            let college = filteredColleges[(currPage - 1) * pageSize + i]
            if (college) { 
                cardArray.push(collegeCard(college))
            }
        }
        setDisplay(cardArray)
    }

    const collegeCard = (college) => {
        return(
            <Card fluid key={college._id}>
                <Card.Content>
                    <Card.Header>
                    <Grid>
                        <Grid.Row columns={2}>
                            <Grid.Column>{college.name}</Grid.Column>
                            <Grid.Column textAlign='right'>
                                <Checkbox 
                                    fitted
                                    dataid={college._id}  
                                    onChange={handleCheck.bind(this)}
                                    checked={selectedIds[college._id] !== undefined}
                                />
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                    </Card.Header>
                    <Card.Description>Country: {college.country}</Card.Description>
                </Card.Content> 
            </Card>
        )
    }

    const handlePaginationChange = (e, { activePage }) => {
        setCurrPage(activePage)
    }

    const handleCheck = (e, { dataid }) => {
        let checkedColleges = selectedIds;
        let collegeId = dataid
        if (checkedColleges[collegeId] !== undefined) {
            delete checkedColleges[collegeId]
        } else {
            checkedColleges[collegeId] = allColleges.find(college => college._id === collegeId);
        }
        //Check for more than one location
        let locations = []
        let colleges = Object.values(checkedColleges)
        for (let i = 0; i < colleges.length; i++) {
            if (!(locations.includes(colleges[i].country))){
                locations.push(colleges[i].country)
            }
        }
        if (locations.length > 1) {
            setMergeButtonDisabled(true);
        } else {
            setMergeButtonDisabled(false);
        }
        setSelectedIds(checkedColleges)
        setMergeButtonActive(Object.keys(selectedIds).length > 1)
    }

    const closeMergeModal = () => {
        setMergeModalOpen(false)
        makeCall({}, '/admin/allColleges/' + props.userDetails._id, 'get')
            .then((res) => {
                    setAllColleges(res.colleges)
                })
        setSelectedIds({})
        setMergeButtonActive(false)
    }

    /* Display Elements */
    const searchBar = (
        <Grid centered>
            <Grid.Row columns={'equal'}>
                <Grid.Column width={8}>
                        <Search
                            open={false}
                            showNoResults={false}
                            onSearchChange={(e, {value}) => setSearch(value)}
                            input={{fluid: true}}
                            placeholder={"Search"}
                        />
                </Grid.Column>
                <Grid.Column width={3} textAlign='left'>
                    <Dropdown
                        placeholder='Search By:'
                        floating
                        selection
                        options={filterOptions}
                        name='filter'
                        onChange={(e, {value}) => setFilter(value)}
                    />
                </Grid.Column>
                {filter !== 'all' &&
                    <Grid.Column width={3}>
                        <Dropdown 
                            placeholder={filter}
                            options={locationOptions()}
                            selection
                            floating
                            onChange={(e, {value}) => setSecondaryFilter(value)}
                        />
                    </Grid.Column>
                }
            </Grid.Row>
        </Grid>
    )

    const resultsBar = (
        <Grid>
            <Grid.Row centered>
                Found {filteredColleges.length} Results!
            </Grid.Row>
        </Grid>
    )

    return(
        <div>
            <NewInstitutionModal 
                type={"COLLEGE"}
                modalOpen={newInstitutionModalOpen}
                toggleModal={() => setNewInstitutionModalOpen(false)}
                userId={props.userDetails._id}
            />
            {mergeModalOpen && 
                <MergeModal
                    viewing={'COLLEGES'}
                    modalOpen={mergeModalOpen}
                    toggleModal={closeMergeModal}
                    selectedItems={selectedIds}
                    userDetails={props.userDetails._id}
                />
            }
            {searchBar}
            {(search || secondaryFilter) && resultsBar}
            <br/>
            {mergeButtonDisabled && mergeButtonActive &&
                <Label pointing='below' basic color='red'>
                    Each college selected must be in the same country
                </Label>
            }
            {mergeButtonActive && 
                <>
                <Button 
                    primary 
                    fluid
                    onClick={() => setMergeModalOpen(!mergeModalOpen)}
                    disabled={mergeButtonDisabled}
                >
                    Merge Colleges
                </Button>
                <br/>
                </>
            }
            <Button
                primary
                onClick={() => setNewInstitutionModalOpen(true)}
                fluid
            >
                Add New College
            </Button>
            <br/>
            <Grid centered>
                <Grid.Row>
                    <Grid.Column width={10}>
                        {display}
                    </Grid.Column>
                </Grid.Row>
            </Grid>
            <Segment textAlign='center'>
                <Pagination
                    activePage={currPage}
                    totalPages={pages}
                    onPageChange={handlePaginationChange}
                />
            </Segment>
        </div>
    )
}