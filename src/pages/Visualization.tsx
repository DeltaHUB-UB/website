import React from 'react';
import styled from 'styled-components';

const VisualizationContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin-bottom: 2rem;
  text-align: center;
`;

const Section = styled.section`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  color: #34495e;
  margin-bottom: 1rem;
`;

const ActivityList = styled.ul`
  list-style-type: disc;
  padding-left: 2rem;
  line-height: 1.8;
`;

const ComingSoon = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3rem;
  border-radius: 12px;
  text-align: center;
  margin-top: 2rem;
`;

const ComingSoonTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 1rem;
`;

const ComingSoonText = styled.p`
  font-size: 1.2rem;
  opacity: 0.9;
`;

const Visualization: React.FC = () => {
    return (
        <VisualizationContainer>
            <Title>Visualization Platform</Title>

            <Section>
                <SectionTitle>Additional Institutional Support</SectionTitle>
                <p>
                    Additional institutional support for the DELTA-HUB project (327.120 EUR) is provided between July 2025 and December 2027 by a grant of the Romanian Ministry of Research, Innovation and Digitization, CNCS/CCCDI - UEFISCDI, project number PN-IV-P8-8.1-PRE-HE-ORG-2025-0283, grant number 118PHE, within PNCDI IV.
                </p>
                <br />
                <p>This support involves the following activities:</p>
                <ActivityList>
                    <li>Scholarship programme dedicated to students and Post-Docs;</li>
                    <li>Mobility programme dedicated to young scientists and promoted by IAB members;</li>
                    <li>Development of long-term collaboration with private sector;</li>
                    <li>Development of DELTA-HUB Laboratory for Data Visualization and Science Communication with a fixed component (dedicated to data storage, visualization and analysis) and a mobile module (dedicated to dissemination and science popularization);</li>
                    <li>Development of a web platform for 3D model visualization and immersive content sharing to the wide public.</li>
                </ActivityList>
            </Section>

            <ComingSoon>
                <ComingSoonTitle>🚀 Stay Tuned!</ComingSoonTitle>
                <ComingSoonText>
                    New updates regarding the visualization platform - coming soon...
                </ComingSoonText>
            </ComingSoon>
        </VisualizationContainer>
    );
};

export default Visualization;
