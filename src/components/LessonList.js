import React from 'react';
import Chatbot from './Chatbot'; // Import the Chatbot component

class LessonList extends React.Component {
    state = {
        selectedLesson: null
    };

    handleLessonClick = (lesson) => {
        console.log('Lesson clicked:', lesson); // Debugging log
        this.setState({ selectedLesson: lesson });
    };

    render() {
        return (
            <div className="lesson-list">
                {this.props.lessons.map(lesson => (
                    <div key={lesson.id} onClick={() => this.handleLessonClick(lesson)}>
                        {lesson.name}
                    </div>
                ))}
                {this.state.selectedLesson && <Chatbot lesson={this.state.selectedLesson} />}
            </div>
        );
    }
}

export default LessonList;
