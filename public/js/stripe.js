/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';
const stripe = Stripe('pk_test_9bYZyBQjxH7VdtqhFmIFe4ht00oJanYlBU');

export const bookTour = async tourId => {
  try {
    // TODO get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    console.log(session);

    // TODO create checkout form + charge credit card}
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};
