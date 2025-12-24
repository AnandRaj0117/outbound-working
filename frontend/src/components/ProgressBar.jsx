import React from "react";
import { styles } from "../styles/dashboardStyles";

export default function ProgressBar({ currentStep }) {
  const steps = [
    { number: 1, label: "Campaign" },
    { number: 2, label: "Upload File" },
    { number: 3, label: "Validate" },
    { number: 4, label: "Upload" }
  ];

  return (
    <div style={styles.progressBar}>
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div style={styles.stepItem}>
            <div style={styles.stepCircle(currentStep >= step.number)}>
              {step.number}
            </div>
            <span style={styles.stepLabel(currentStep >= step.number)}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && <div style={styles.connector}></div>}
        </React.Fragment>
      ))}
    </div>
  );
}
