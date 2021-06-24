Two APIs

Synchronous GET requests to two public APIs: Zomato and Pexels.
First, the user opens up their browser, and enters a city name. This makes a call to Zomato API, which returns restaurant collections in the chosen city. One of the collection titles is used to make an API request to Pexels. In turn, Pexels responds with 15 images, which are then served to the browser of the user.
Some exception handling was implemented for cases when the entered city does not exist, in such case, the user is prompted to enter a name of a different city.
