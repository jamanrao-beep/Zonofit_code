import { useEffect, useState } from "react";

/** True once `active` has stayed on long enough to reassure a waiting person. */
export function usePatientHint(active: boolean) {
  const [patient, setPatient] = useState(false);
  useEffect(() => {
    if (!active) {
      setPatient(false);
      return;
    }
    const timer = setTimeout(() => setPatient(true), 650);
    return () => clearTimeout(timer);
  }, [active]);
  return patient;
}
