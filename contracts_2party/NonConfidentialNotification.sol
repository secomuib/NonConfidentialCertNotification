pragma solidity ^0.4.24;

// Notificació certificada no confidencial, d'un sol ús
contract NonConfidentialNotification {
    // Parties involved
    address public sender;
    address public receiver;

    // Message
    bytes32 public messageHash;
    string public message;
    // Time limit (in seconds)
    // See units: http://solidity.readthedocs.io/en/develop/units-and-global-variables.html?highlight=timestamp#time-units
    uint public term; 
    // Start time
    uint public start; 

    // Possible states
    enum State {created, cancelled, accepted, finished }
    State public state;

    event StateInfo( State state );

    constructor (address _receiver, bytes32 _messageHash, uint _term) public payable {
        require (msg.value>0); // Requires that the sender send a deposit of minimum 1 wei (>0 wei)
        sender = msg.sender;
        receiver = _receiver;
        messageHash = _messageHash;
        start = now; // now = block.timestamp
        term = _term;
        state = State.created;
        emit StateInfo(state);
    }

    function accept() public {
        require (msg.sender==receiver && state==State.created);
        state = State.accepted;
        emit StateInfo(state);
    }

    function finish(string _message) public {
        require(now < start+term); // It's not possible to finish after deadline
        require (msg.sender==sender && state==State.accepted);
        require (messageHash==keccak256(_message));
        message = _message;
        sender.transfer(this.balance); // Sender receives the refund of the deposit
        state = State.finished;
        emit StateInfo(state);
    }

    function cancel() public {
        require(now >= start+term); //  It's not possible to cancel before deadline
        require((msg.sender==sender && state==State.created) || (msg.sender==receiver && state==State.accepted));
        if (msg.sender==sender && state==State.created) {
            sender.transfer(this.balance); // Sender receives the refund of the deposit
        }
        state = State.cancelled;
        emit StateInfo(state);
    }

    function getState() public view returns (string) {
        if (state==State.created) {
            return "created";
        } else if (state==State.cancelled) {
            return "cancelled";
        } else if (state==State.accepted) {
            return "accepted";
        } else if (state==State.finished) {
            return "finished";
        } 
    }
}