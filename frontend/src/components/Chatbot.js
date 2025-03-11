import React from 'react';

class Chatbot extends React.Component {
    render() {
        console.log('Rendering Chatbot for lesson:', this.props.lesson); // Debugging log
        return (
            <div className="chatbot">
                <h2>Chatbot</h2>
                <p>Chatting about: {this.props.lesson.name}</p>
                {/* Add chatbot UI and functionality here */}
            </div>
        );
    }
}

export default Chatbot;
