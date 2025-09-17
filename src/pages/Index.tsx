// Redirect to dashboard - this is a contractor-facing price aggregator
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate("/app/dashboard", { replace: true });
  }, [navigate]);

  return null;
};

export default Index;
