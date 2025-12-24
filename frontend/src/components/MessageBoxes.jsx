import React from "react";
import { styles } from "../styles/dashboardStyles";

export function ErrorBox({ error }) {
  if (!error) return null;
  return <div style={styles.errorBox}>{error}</div>;
}

export function SuccessBox({ message }) {
  if (!message) return null;
  return <div style={styles.successBox}>{message}</div>;
}

export function MessageBox({ message }) {
  if (!message) return null;
  return <div style={styles.messageBox}>{message}</div>;
}
