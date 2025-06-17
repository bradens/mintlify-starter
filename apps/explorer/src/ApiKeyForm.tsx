import { useState } from "react";

export function ApiKeyForm() {
  const [apiKeyFormValue, setApiKeyFormValue] = useState<string | null>(null);
  const params = new URLSearchParams(window.location?.search || "");

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!apiKeyFormValue?.length) return
    params.set("key", apiKeyFormValue.trim())
    localStorage.setItem("d-explorer-key", apiKeyFormValue.trim())
    window.location.search = params.toString()
    e.preventDefault();
  }

  return (
    <>
      <form onSubmit={onFormSubmit} className="mt-8 max-w-sm mx-auto">
        <div className="p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
          <span className="font-medium">Heads up!</span> In order to get started with the explorer, you need to submit your api key here.
        </div>
        <div className="mb-5">
          <label htmlFor="apikey" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your apiKey</label>
          <input onChange={(e) => setApiKeyFormValue(e.target.value)} type="password" id="apikey" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="0abc..." required />
        </div>
        <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Submit</button>
      </form>
    </>
  )
}