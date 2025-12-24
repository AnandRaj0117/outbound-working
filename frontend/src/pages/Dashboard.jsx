import React, { useState } from "react";
import Header from "../components/Header";
import ProgressBar from "../components/ProgressBar";
import Step1Campaign from "../components/steps/Step1Campaign";
import Step2Upload from "../components/steps/Step2Upload";
import Step3Validate from "../components/steps/Step3Validate";
import Step4GoogleUpload from "../components/steps/Step4GoogleUpload";
import { styles } from "../styles/dashboardStyles";

export default function Dashboard({ user }) {
  const [step, setStep] = useState(1);
  const [campaign, setCampaign] = useState(null);
  const [dncEnabled, setDncEnabled] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  return (
    <div style={styles.page}>
      

      <div style={styles.container}>
        <ProgressBar currentStep={step} />

        {step === 1 && (
          <Step1Campaign
            onContinue={() => setStep(2)}
            campaign={campaign}
            setCampaign={setCampaign}
            dncEnabled={dncEnabled}
            setDncEnabled={setDncEnabled}
          />
        )}

        {step === 2 && (
          <Step2Upload
            campaign={campaign}
            dncEnabled={dncEnabled}
            user={user}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
            setUploadResult={setUploadResult}
          />
        )}

        {step === 3 && (
          <Step3Validate
            campaign={campaign}
            uploadResult={uploadResult}
            onBack={() => setStep(2)}
            onContinue={() => setStep(4)}
            setValidationResult={setValidationResult}
          />
        )}

        {step === 4 && (
          <Step4GoogleUpload
            campaign={campaign}
            validationResult={validationResult}
            onBack={() => setStep(3)}
            setValidationResult={setValidationResult}
          />
        )}
      </div>
    </div>
  );
}