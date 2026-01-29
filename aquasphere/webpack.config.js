const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'NG_APP_SUPABASE_URL': JSON.stringify(process.env.NG_APP_SUPABASE_URL || ''),
      'NG_APP_SUPABASE_KEY': JSON.stringify(process.env.NG_APP_SUPABASE_KEY || '')
    })
  ]
};
