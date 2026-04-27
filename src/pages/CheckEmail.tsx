
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mail, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

const CheckEmail = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg border p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-4">{t("auth.checkEmail.title")}</h1>
            <p className="text-muted-foreground mb-6">
              {t("auth.checkEmail.body")}
            </p>

            <div className="space-y-4">
              <Button asChild className="w-full">
                <Link to="/sign-in">{t("auth.checkEmail.returnToSignIn")}</Link>
              </Button>

              <p className="text-sm text-muted-foreground mt-4">
                {t("auth.checkEmail.didntReceive")}{" "}
                <Link to="/sign-up" className="text-primary hover:underline">
                  {t("auth.checkEmail.tryAgain")}
                </Link>
              </p>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                <div className="flex items-start">
                  <RefreshCw className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-left">
                    <strong>{t("auth.checkEmail.noteLabel")}</strong> {t("auth.checkEmail.devNote")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckEmail;
