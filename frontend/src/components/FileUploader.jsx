import React from 'react';

const ExampleComponent = (props) => {
    return (
        <div>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
        </div>
    );
};

export default ExampleComponent;