import React from "react";
import { Container, Row, Col } from "react-bootstrap";

const About = () => {
    return (
        <Container>
            <h1>About Delta Hub</h1>
            <p>
                Delta Hub is an innovative initiative designed to foster collaboration
                and knowledge sharing among researchers, practitioners, and policymakers
                in the field of digital technology and education. Our mission is to
                empower individuals and organizations to harness the full potential of
                digital tools and resources to enhance teaching, learning, and
                research.
            </p>
            <p>
                At Delta Hub, we believe in the transformative power of digital
                technology to create inclusive, engaging, and effective learning
                experiences. We are committed to providing a platform that enables
                seamless collaboration and exchange of ideas, practices, and
                technologies.
            </p>
            <p>
                Our vision is to be a leading hub for digital education innovation,
                recognized for our contributions to advancing knowledge, shaping
                policies, and promoting the adoption of effective digital practices in
                education and research.
            </p>
            <Row>
                <Col>
                    <h2>Our Objectives</h2>
                    <ul>
                        <li>
                            To promote interdisciplinary collaboration and networking among
                            researchers, practitioners, and policymakers.
                        </li>
                        <li>
                            To facilitate access to high-quality digital resources and
                            technologies.
                        </li>
                        <li>
                            To provide professional development and training opportunities in
                            digital education.
                        </li>
                        <li>
                            To support research and innovation in the use of digital
                            technology for education and training.
                        </li>
                        <li>
                            To advocate for policies and practices that enhance the
                            integration of digital technology in education and research.
                        </li>
                    </ul>
                </Col>
            </Row>
        </Container>
    );
};

export default About;