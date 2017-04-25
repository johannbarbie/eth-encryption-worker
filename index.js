const Web3 = require('web3')
const ZeroClientEngine = require('web3-provider-engine/zero.js')

module.exports = Lib

function Lib(opts){
	return {
		web3: Web3,
		zero: ZeroClientEngine
	};
}
