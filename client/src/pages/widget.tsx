import { CustomerWidget } from "@/components/widget/customer-widget";

export default function Widget() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">CleanFlow</h1>
          <p className="text-blue-100">Professional cleaning services made simple</p>
        </div>
        <CustomerWidget standalone />
      </div>
    </div>
  );
}
