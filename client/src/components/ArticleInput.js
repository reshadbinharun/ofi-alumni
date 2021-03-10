import React, { useState, useEffect } from 'react';
import { Feed, Accordion, Icon } from 'semantic-ui-react'
import { makeCall } from "../apis";
import ArticleInputComments from './ArticleInputComments'

/**
 * Each input in a collaborative article with a collapsible comments section
 * @param {*} props 
 * input, input to an article
 * refreshArticle, () method that refetches article
 */
export default function ArticleInput (props) {
    const [revealComments, setRevealComments] = useState(false)

    const likeInput = (inputId) => {
        makeCall({},`/articles/likeArticle/${props.userId}/${inputId}`, 'patch').then(res => {
            if (!res && res.error) {
                // TODO error
            } else {
                props.refreshArticle()
            }
        })
    }

    const input = props.input
    return (
        <>
            <Feed.Event>
                <Feed.Label>
                    {
                        input.isAnonymous ? 
                        <div>
                            <Icon name='user' />
                        </div> :
                        <div>
                            <img src={input.author.imageURL}/>
                        </div>
                    }
                </Feed.Label>
                <Feed.Content>
                    <Feed.Date>
                        {input.timeElapsed}
                    </Feed.Date>
                    <Feed.Meta>
                        { (input.isAnonymous ? `Anonymous User` : input.author.name) + `, ` + [input.author.majorName, input.author.jobTitleName].join(' | ') }
                    </Feed.Meta>
                    <Feed.Summary>
                        {input.input}
                    </Feed.Summary>
                    <Feed.Extra>
                        <Feed.Like>
                            <Icon name='like' onClick={() => likeInput(input._id)}/> {input.usersLiked ? (input.usersLiked.length).toString() : '0' }
                        </Feed.Like>
                    </Feed.Extra>
                </Feed.Content>
            </Feed.Event>
            <Accordion>
                <Accordion.Title
                    onClick={() => setRevealComments(!revealComments)}
                    active={revealComments}
                >
                    <Icon name='dropdown' />
                    Show Comments
                </Accordion.Title>
                <Accordion.Content active={revealComments}>
                    <ArticleInputComments
                        inputId={input._id}
                        userId={props.userId}
                        comments={input.comments}
                        refreshArticle={props.refreshArticle}
                    />
                </Accordion.Content>
            </Accordion>
        </>
    )
}